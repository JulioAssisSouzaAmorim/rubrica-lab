using RubricaLab.Core.Syntax;

namespace RubricaLab.Core.Engine;

public sealed record RubricDelta(string Code, decimal Before, decimal After, decimal Delta);

public sealed record MarginalResult(
    string Input,
    decimal Step,
    decimal NetBefore,
    decimal NetAfter,
    decimal RetainedRatio,
    IReadOnlyList<RubricDelta> Deltas);

public sealed record SweepPoint(decimal X, decimal Earnings, decimal Deductions, decimal Net, decimal? MarginalRetained);

public sealed record MarginalAnalysis(MarginalResult? Result, IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool Success => Result is not null;
}

public sealed record SweepAnalysis(IReadOnlyList<SweepPoint>? Points, IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool Success => Points is not null;
}

/// <summary>Treats the payslip as a function of one input and probes it numerically.</summary>
public static class Sensitivity
{
    public const int MaxSweepPoints = 200;

    /// <summary>How much of an extra <paramref name="step"/> on <paramref name="input"/> reaches the net pay.</summary>
    public static MarginalAnalysis Marginal(CompiledSheet sheet, string input, decimal step)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        if (step == 0)
        {
            return new(null, Error("O passo deve ser diferente de zero."));
        }
        if (Resolve(sheet, input) is not { } name)
        {
            return new(null, Error($"Entrada desconhecida '{input}'."));
        }

        var before = sheet.Evaluate();
        var after = sheet.Evaluate(new Dictionary<string, decimal> { [name] = sheet.InputValue(name) + step });
        if (!before.Success || !after.Success)
        {
            return new(null, [.. before.Diagnostics, .. after.Diagnostics]);
        }

        var deltas = before.Rubrics
            .Zip(after.Rubrics, (b, a) => new RubricDelta(b.Code, b.Value, a.Value, a.Value - b.Value))
            .Where(d => d.Delta != 0)
            .ToList();
        var (netBefore, netAfter) = (before.Totals!.Net, after.Totals!.Net);
        return new(new MarginalResult(name, step, netBefore, netAfter, (netAfter - netBefore) / step, deltas), []);
    }

    /// <summary>Evaluates the sheet at evenly spaced values of <paramref name="input"/>.</summary>
    public static SweepAnalysis Sweep(
        CompiledSheet sheet,
        string input,
        decimal from,
        decimal to,
        int points)
    {
        ArgumentNullException.ThrowIfNull(sheet);

        if (points is < 2 or > MaxSweepPoints || from >= to)
        {
            return new(null, Error($"Use de 2 a {MaxSweepPoints} pontos e um intervalo crescente."));
        }
        if (Resolve(sheet, input) is not { } name)
        {
            return new(null, Error($"Entrada desconhecida '{input}'."));
        }

        var step = (to - from) / (points - 1);
        var result = new List<SweepPoint>(points);
        for (var i = 0; i < points; i++)
        {
            var x = i == points - 1 ? to : from + step * i;
            var evaluation = sheet.Evaluate(new Dictionary<string, decimal> { [name] = x });
            if (!evaluation.Success)
            {
                return new(null, evaluation.Diagnostics);
            }

            var totals = evaluation.Totals!;
            decimal? marginal = result.Count == 0 ? null : (totals.Net - result[^1].Net) / (x - result[^1].X);
            result.Add(new SweepPoint(x, totals.Earnings, totals.Deductions, totals.Net, marginal));
        }
        return new(result, []);
    }

    private static string? Resolve(CompiledSheet sheet, string input) =>
        sheet.InputNames.FirstOrDefault(n => string.Equals(n, input, StringComparison.OrdinalIgnoreCase));
    private static Diagnostic[] Error(string message) => [new Diagnostic(DiagnosticCodes.Runtime, message)];
}
