using System.Globalization;
using RubricaLab.Core.Model;
using RubricaLab.Core.Syntax;

namespace RubricaLab.Core.Engine;

internal readonly record struct Symbol(string Name, decimal Value, bool IsRubric);

internal sealed class Evaluator(
    string source,
    IReadOnlyDictionary<string, Symbol> symbols,
    IReadOnlyDictionary<string, TaxTable> tables)
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public TraceNode Evaluate(Expr expr) => expr switch
    {
        NumberExpr n => TraceNode.Leaf(Text(n), n.Value),
        NameExpr n => Name(n),
        PercentExpr p => Percent(p),
        UnaryExpr u => Unary(u),
        BinaryExpr b => Binary(b),
        CallExpr c => Call(c),
        _ => throw new InvalidOperationException($"Unsupported node {expr.GetType().Name}."),
    };

    private string Text(Expr expr) => source.Substring(expr.Span.Start, expr.Span.Length);

    private TraceNode Name(NameExpr n)
    {
        var symbol = symbols[n.Name];
        return symbol.IsRubric
            ? TraceNode.Leaf(symbol.Name, symbol.Value, reference: symbol.Name)
            : TraceNode.Leaf(symbol.Name, symbol.Value, note: "entrada");
    }

    private TraceNode Percent(PercentExpr p)
    {
        var operand = Evaluate(p.Operand);
        return Node(p, operand.Value / 100m, operand);
    }

    private TraceNode Unary(UnaryExpr u)
    {
        var operand = Evaluate(u.Operand);
        var value = u.Operator == TokenKind.Minus ? -operand.Value : Bool(!Truthy(operand.Value));
        return Node(u, value, operand);
    }

    private TraceNode Binary(BinaryExpr b)
    {
        var left = Evaluate(b.Left);

        if (b.Operator is TokenKind.AndAnd or TokenKind.OrOr)
        {
            var shortCircuit = b.Operator == TokenKind.AndAnd ? !Truthy(left.Value) : Truthy(left.Value);
            if (shortCircuit)
            {
                return Node(b, Bool(Truthy(left.Value)), left) with { Note = "curto-circuito" };
            }
            var rhs = Evaluate(b.Right);
            return Node(b, Bool(Truthy(rhs.Value)), left, rhs);
        }

        var right = Evaluate(b.Right);
        var (l, r) = (left.Value, right.Value);
        var value = b.Operator switch
        {
            TokenKind.Plus => l + r,
            TokenKind.Minus => l - r,
            TokenKind.Star => l * r,
            TokenKind.Slash when r == 0 => throw Fail(b.Right, "Divisão por zero."),
            TokenKind.Slash => l / r,
            TokenKind.EqualEqual => Bool(l == r),
            TokenKind.BangEqual => Bool(l != r),
            TokenKind.Less => Bool(l < r),
            TokenKind.LessEqual => Bool(l <= r),
            TokenKind.Greater => Bool(l > r),
            TokenKind.GreaterEqual => Bool(l >= r),
            _ => throw new InvalidOperationException($"Unsupported operator {b.Operator}."),
        };
        return Node(b, value, left, right);
    }

    private TraceNode Call(CallExpr c)
    {
        var function = Builtins.All[c.Function].Name;
        switch (function)
        {
            case "se":
                var condition = Evaluate(c.Arguments[0]);
                var taken = Truthy(condition.Value);
                var branch = Evaluate(c.Arguments[taken ? 1 : 2]);
                return Node(c, branch.Value, condition, branch) with
                {
                    Note = taken ? "condição verdadeira" : "condição falsa",
                };
            case "progressiva":
                return Progressive(c);
            case "faixa":
                return Bracketed(c);
        }

        var args = c.Arguments.Select(Evaluate).ToArray();
        var values = args.Select(a => a.Value).ToArray();
        var result = function switch
        {
            "min" => values.Min(),
            "max" => values.Max(),
            "abs" => Math.Abs(values[0]),
            "limite" when values[1] > values[2] => throw Fail(c, "limite(): mínimo maior que o máximo."),
            "limite" => Math.Clamp(values[0], values[1], values[2]),
            "arred" => Round(c, values),
            _ => throw new InvalidOperationException($"Unbound function {c.Function}."),
        };
        return Node(c, result, args);
    }

    private static decimal Round(CallExpr c, decimal[] values)
    {
        var places = values.Length > 1 ? values[1] : 2m;
        if (places != decimal.Truncate(places) || places is < 0 or > 10)
        {
            throw Fail(c.Arguments[1], "arred(): casas decimais devem ser um inteiro entre 0 e 10.");
        }
        return Math.Round(values[0], (int)places, MidpointRounding.AwayFromZero);
    }

    private TraceNode Progressive(CallExpr c)
    {
        var baseTrace = Evaluate(c.Arguments[0]);
        var table = tables[((NameExpr)c.Arguments[1]).Name];
        var parts = new List<TraceNode> { baseTrace };
        var total = 0m;
        var lower = 0m;

        for (var i = 0; i < table.Brackets.Count && baseTrace.Value > lower; i++)
        {
            var bracket = table.Brackets[i];
            var upper = bracket.UpTo ?? decimal.MaxValue;
            var taxable = Math.Min(baseTrace.Value, upper) - lower;
            var amount = taxable * bracket.Rate;
            parts.Add(TraceNode.Leaf(
                $"Faixa {i + 1}: {Money(taxable)} × {Rate(bracket.Rate)}",
                amount,
                note: bracket.UpTo is { } limit ? $"de {Money(lower)} até {Money(limit)}" : $"acima de {Money(lower)}"));
            total += amount;
            lower = upper;
        }

        var node = Node(c, total, [.. parts]) with { Note = table.Description };
        var ceiling = table.Brackets[^1].UpTo;
        return ceiling is { } cap && baseTrace.Value > cap
            ? node with { Note = $"{table.Description} · teto de {Money(cap)}, excedente não incide" }
            : node;
    }

    private TraceNode Bracketed(CallExpr c)
    {
        var baseTrace = Evaluate(c.Arguments[0]);
        var table = tables[((NameExpr)c.Arguments[1]).Name];
        var index = 0;
        while (index < table.Brackets.Count - 1 && table.Brackets[index].UpTo is { } upTo && baseTrace.Value > upTo)
        {
            index++;
        }

        var bracket = table.Brackets[index];
        var gross = baseTrace.Value * bracket.Rate - bracket.Deduction;
        var value = Math.Max(0m, gross);
        var detail = TraceNode.Leaf(
            $"Faixa {index + 1}: {Money(baseTrace.Value)} × {Rate(bracket.Rate)} − {Money(bracket.Deduction)}",
            value,
            note: gross < 0 ? "resultado negativo zerado" : null);
        return Node(c, value, baseTrace, detail) with { Note = table.Description };
    }

    private TraceNode Node(Expr expr, decimal value, params TraceNode[] children) => new(Text(expr), value, children);

    private static DslException Fail(Expr at, string message) =>
        new(new Diagnostic(DiagnosticCodes.Runtime, message, at.Span));

    private static bool Truthy(decimal value) => value != 0m;

    private static decimal Bool(bool value) => value ? 1m : 0m;

    private static string Money(decimal value) => value.ToString("C2", PtBr);

    private static string Rate(decimal rate) => (rate * 100m).ToString("0.##", PtBr) + "%";
}
