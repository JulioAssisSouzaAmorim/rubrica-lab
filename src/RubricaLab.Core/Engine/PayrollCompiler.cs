using RubricaLab.Core.Model;
using RubricaLab.Core.Syntax;

namespace RubricaLab.Core.Engine;

public static class PayrollCompiler
{
    public const int MaxFormulaLength = 2_000;

    public static CompilationResult Compile(PayrollSheet sheet)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        var diagnostics = new List<Diagnostic>();
        var inputs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var tables = new Dictionary<string, TaxTable>(StringComparer.OrdinalIgnoreCase);
        var rubrics = new Dictionary<string, Rubric>(StringComparer.OrdinalIgnoreCase);

        foreach (var name in sheet.Inputs.Keys)
        {
            if (!Lexer.IsValidIdentifier(name))
            {
                diagnostics.Add(new(DiagnosticCodes.InvalidName, $"Nome de entrada inválido: '{name}'."));
            }
            else if (!inputs.Add(name))
            {
                diagnostics.Add(new(DiagnosticCodes.DuplicateName, $"Entrada '{name}' declarada mais de uma vez."));
            }
        }

        foreach (var table in sheet.Tables)
        {
            var problem = ValidateTable(table);
            if (problem is not null)
            {
                diagnostics.Add(new(DiagnosticCodes.InvalidTable, $"Tabela '{table.Code}': {problem}"));
            }
            else if (!tables.TryAdd(table.Code, table))
            {
                diagnostics.Add(new(DiagnosticCodes.DuplicateName, $"Tabela '{table.Code}' declarada mais de uma vez."));
            }
        }

        foreach (var rubric in sheet.Rubrics)
        {
            if (!Lexer.IsValidIdentifier(rubric.Code))
            {
                diagnostics.Add(new(DiagnosticCodes.InvalidName, $"Código de rubrica inválido: '{rubric.Code}'.", Rubric: rubric.Code));
            }
            else if (inputs.Contains(rubric.Code) || tables.ContainsKey(rubric.Code))
            {
                diagnostics.Add(new(DiagnosticCodes.DuplicateName, $"'{rubric.Code}' já é usado por uma entrada ou tabela.", Rubric: rubric.Code));
            }
            else if (!rubrics.TryAdd(rubric.Code, rubric))
            {
                diagnostics.Add(new(DiagnosticCodes.DuplicateName, $"Rubrica '{rubric.Code}' declarada mais de uma vez.", Rubric: rubric.Code));
            }
        }

        var binder = new Binder(inputs, tables, rubrics);
        var compiled = new Dictionary<string, (Rubric Rubric, Expr Ast)>(StringComparer.OrdinalIgnoreCase);
        var dependencies = new Dictionary<string, IReadOnlySet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var rubric in rubrics.Values)
        {
            try
            {
                if (rubric.Formula.Length > MaxFormulaLength)
                {
                    throw new DslException(new(DiagnosticCodes.TooComplex, $"Fórmula com mais de {MaxFormulaLength} caracteres."));
                }
                var ast = Parser.Parse(rubric.Formula);
                var (deps, problems) = binder.Bind(ast);
                diagnostics.AddRange(problems.Select(p => p with { Rubric = rubric.Code }));
                compiled[rubric.Code] = (rubric, ast);
                dependencies[rubric.Code] = deps;
            }
            catch (DslException ex)
            {
                diagnostics.Add(ex.Diagnostic with { Rubric = rubric.Code });
            }
        }

        var nodes = sheet.Rubrics
            .Select(r => r.Code)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(compiled.ContainsKey)
            .ToList();
        var (order, cycles) = RubricGraph.Sort(nodes, dependencies);
        foreach (var cycle in cycles)
        {
            diagnostics.Add(new(
                DiagnosticCodes.Cycle,
                $"Dependência circular: {string.Join(" → ", cycle)}.",
                Rubric: cycle[0]));
        }

        if (diagnostics.Count > 0)
        {
            return new CompilationResult(null, diagnostics);
        }

        var steps = order.Select(code => new CompiledRubric(compiled[code].Rubric, compiled[code].Ast, dependencies[code])).ToList();
        var declared = sheet.Rubrics.Select(r => r.Code).ToList();
        return new CompilationResult(new CompiledSheet(steps, declared, tables, sheet.Inputs), []);
    }

    /// <summary>Returns a description of what is wrong with the table, or null when it is valid.</summary>
    public static string? ValidateTable(TaxTable table)
    {
        if (!Lexer.IsValidIdentifier(table.Code))
        {
            return "código inválido.";
        }
        if (table.Brackets.Count == 0)
        {
            return "precisa de ao menos uma faixa.";
        }

        decimal? previous = null;
        for (var i = 0; i < table.Brackets.Count; i++)
        {
            var bracket = table.Brackets[i];
            if (bracket.Rate is < 0 or > 1)
            {
                return $"alíquota da faixa {i + 1} deve estar entre 0 e 1.";
            }
            if (bracket.UpTo is null && i != table.Brackets.Count - 1)
            {
                return "apenas a última faixa pode ser ilimitada.";
            }
            if (bracket.UpTo is { } upTo && (upTo <= 0 || upTo <= previous))
            {
                return $"limites das faixas devem ser positivos e crescentes (faixa {i + 1}).";
            }
            previous = bracket.UpTo;
        }
        return null;
    }

    private sealed class Binder(
        IReadOnlySet<string> inputs,
        IReadOnlyDictionary<string, TaxTable> tables,
        IReadOnlyDictionary<string, Rubric> rubrics)
    {
        public (IReadOnlySet<string> Dependencies, IReadOnlyList<Diagnostic> Problems) Bind(Expr root)
        {
            var dependencies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var problems = new List<Diagnostic>();
            Visit(root, dependencies, problems);
            return (dependencies, problems);
        }

        private void Visit(Expr expr, HashSet<string> dependencies, List<Diagnostic> problems)
        {
            switch (expr)
            {
                case NameExpr name when rubrics.TryGetValue(name.Name, out var rubric):
                    dependencies.Add(rubric.Code);
                    break;
                case NameExpr name when !inputs.Contains(name.Name):
                    var hint = Suggestions.Closest(name.Name, inputs.Concat(rubrics.Keys));
                    var message = tables.ContainsKey(name.Name)
                        ? $"'{name.Name}' é uma tabela; use-a em progressiva() ou faixa()."
                        : $"Nome desconhecido '{name.Name}'." + (hint is null ? "" : $" Você quis dizer '{hint}'?");
                    problems.Add(new(DiagnosticCodes.UnknownIdentifier, message, name.Span));
                    break;
                case UnaryExpr unary:
                    Visit(unary.Operand, dependencies, problems);
                    break;
                case PercentExpr percent:
                    Visit(percent.Operand, dependencies, problems);
                    break;
                case BinaryExpr binary:
                    Visit(binary.Left, dependencies, problems);
                    Visit(binary.Right, dependencies, problems);
                    break;
                case CallExpr call:
                    VisitCall(call, dependencies, problems);
                    break;
            }
        }

        private void VisitCall(CallExpr call, HashSet<string> dependencies, List<Diagnostic> problems)
        {
            if (!Builtins.All.TryGetValue(call.Function, out var function))
            {
                var hint = Suggestions.Closest(call.Function, Builtins.All.Keys);
                problems.Add(new(
                    DiagnosticCodes.UnknownFunction,
                    $"Função desconhecida '{call.Function}'." + (hint is null ? "" : $" Você quis dizer '{hint}'?"),
                    call.NameSpan));
                return;
            }

            if (call.Arguments.Count < function.MinArgs || call.Arguments.Count > function.MaxArgs)
            {
                problems.Add(new(
                    DiagnosticCodes.Arity,
                    $"{function.Signature} recebeu {call.Arguments.Count} argumento(s).",
                    call.Span));
                return;
            }

            for (var i = 0; i < call.Arguments.Count; i++)
            {
                var argument = call.Arguments[i];
                if (i != function.TableArgument)
                {
                    Visit(argument, dependencies, problems);
                }
                else if (argument is not NameExpr table || !tables.ContainsKey(table.Name))
                {
                    problems.Add(new(
                        DiagnosticCodes.UnknownTable,
                        $"{function.Name}() espera o código de uma tabela no argumento {i + 1}.",
                        argument.Span));
                }
            }
        }
    }
}
