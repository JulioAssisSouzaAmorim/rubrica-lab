using RubricaLab.Core.Engine;
using RubricaLab.Core.Model;
using RubricaLab.Core.Samples;

namespace RubricaLab.Core.Tests;

internal static class TestSheets
{
    public static PayrollSheet Single(string formula, Dictionary<string, decimal>? inputs = null) =>
        Of([new Rubric("R", "Teste", RubricKind.Earning, formula)], inputs);

    public static PayrollSheet Of(IReadOnlyList<Rubric> rubrics, Dictionary<string, decimal>? inputs = null) =>
        new(rubrics, [SampleSheets.Inss2025, SampleSheets.Irrf2025], inputs ?? []);

    public static Rubric Earning(string code, string formula) => new(code, code, RubricKind.Earning, formula);

    public static Rubric Deduction(string code, string formula) => new(code, code, RubricKind.Deduction, formula);

    public static EvaluationResult Evaluate(PayrollSheet sheet)
    {
        var compilation = PayrollCompiler.Compile(sheet);
        Assert.True(compilation.Success, string.Join("; ", compilation.Diagnostics.Select(d => d.Message)));
        return compilation.Sheet!.Evaluate();
    }

    public static decimal Value(string formula, Dictionary<string, decimal>? inputs = null)
    {
        var result = Evaluate(Single(formula, inputs));
        Assert.True(result.Success, string.Join("; ", result.Diagnostics.Select(d => d.Message)));
        return result.Rubrics[0].Value;
    }
}
