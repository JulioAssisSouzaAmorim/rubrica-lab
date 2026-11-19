using RubricaLab.Core.Model;
using RubricaLab.Core.Syntax;

namespace RubricaLab.Core.Engine;

internal sealed record CompiledRubric(Rubric Rubric, Expr Ast, IReadOnlySet<string> Dependencies);

/// <summary>A validated, topologically ordered sheet that can be evaluated many times with different inputs.</summary>
public sealed class CompiledSheet
{
    private readonly IReadOnlyList<CompiledRubric> _steps;
    private readonly IReadOnlyList<string> _declared;
    private readonly IReadOnlyDictionary<string, TaxTable> _tables;
    private readonly IReadOnlyDictionary<string, decimal> _inputs;

    internal CompiledSheet(
        IReadOnlyList<CompiledRubric> steps,
        IReadOnlyList<string> declared,
        IReadOnlyDictionary<string, TaxTable> tables,
        IReadOnlyDictionary<string, decimal> inputs)
    {
        _steps = steps;
        _declared = declared;
        _tables = tables;
        _inputs = inputs;
    }

    public IReadOnlyList<string> Order => [.. _steps.Select(s => s.Rubric.Code)];

    public IReadOnlyCollection<string> InputNames => [.. _inputs.Keys];

    public decimal InputValue(string name) => _inputs[name];

    public EvaluationResult Evaluate(IReadOnlyDictionary<string, decimal>? overrides = null)
    {
        var symbols = new Dictionary<string, Symbol>(StringComparer.OrdinalIgnoreCase);
        foreach (var (name, value) in _inputs)
        {
            symbols[name] = new Symbol(name, value, IsRubric: false);
        }
        foreach (var (name, value) in overrides ?? new Dictionary<string, decimal>())
        {
            if (!symbols.TryGetValue(name, out var existing))
            {
                return EvaluationResult.Failed([new(DiagnosticCodes.UnknownIdentifier, $"Entrada desconhecida '{name}'.")]);
            }
            symbols[name] = existing with { Value = value };
        }

        var results = new Dictionary<string, RubricResult>(StringComparer.OrdinalIgnoreCase);
        foreach (var step in _steps)
        {
            var rubric = step.Rubric;
            TraceNode trace;
            try
            {
                trace = new Evaluator(rubric.Formula, symbols, _tables).Evaluate(step.Ast);
            }
            catch (DslException ex)
            {
                return EvaluationResult.Failed([ex.Diagnostic with { Rubric = rubric.Code }]);
            }
            catch (OverflowException)
            {
                return EvaluationResult.Failed([new(DiagnosticCodes.Runtime, "Valor fora do intervalo numérico suportado.", Rubric: rubric.Code)]);
            }

            symbols[rubric.Code] = new Symbol(rubric.Code, trace.Value, IsRubric: true);
            results[rubric.Code] = new RubricResult(
                rubric.Code,
                rubric.Description,
                rubric.Kind,
                trace.Value,
                [.. step.Dependencies.Order(StringComparer.OrdinalIgnoreCase)],
                trace);
        }

        var ordered = _declared.Select(code => results[code]).ToList();
        try
        {
            var earnings = ordered.Where(r => r.Kind == RubricKind.Earning).Sum(r => r.Value);
            var deductions = ordered.Where(r => r.Kind == RubricKind.Deduction).Sum(r => r.Value);
            return new EvaluationResult(true, ordered, new Totals(earnings, deductions, earnings - deductions), Order, []);
        }
        catch (OverflowException)
        {
            return EvaluationResult.Failed([new(DiagnosticCodes.Runtime, "Totais fora do intervalo numérico suportado.")]);
        }
    }
}
