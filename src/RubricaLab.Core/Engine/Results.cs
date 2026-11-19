using RubricaLab.Core.Model;
using RubricaLab.Core.Syntax;

namespace RubricaLab.Core.Engine;

public sealed record RubricResult(
    string Code,
    string Description,
    RubricKind Kind,
    decimal Value,
    IReadOnlyList<string> DependsOn,
    TraceNode Trace);

public sealed record Totals(decimal Earnings, decimal Deductions, decimal Net);

public sealed record EvaluationResult(
    bool Success,
    IReadOnlyList<RubricResult> Rubrics,
    Totals? Totals,
    IReadOnlyList<string> Order,
    IReadOnlyList<Diagnostic> Diagnostics)
{
    public static EvaluationResult Failed(IReadOnlyList<Diagnostic> diagnostics) => new(false, [], null, [], diagnostics);
}

public sealed record CompilationResult(CompiledSheet? Sheet, IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool Success => Sheet is not null;
}
