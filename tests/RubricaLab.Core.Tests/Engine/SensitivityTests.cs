using RubricaLab.Core.Engine;
using RubricaLab.Core.Samples;
using static RubricaLab.Core.Tests.TestSheets;

namespace RubricaLab.Core.Tests.Engine;

public class SensitivityTests
{
    private static readonly CompiledSheet Sample = PayrollCompiler.Compile(SampleSheets.Clt2025).Sheet!;

    [Fact]
    public void Marginal_reports_how_much_of_a_raise_reaches_net_pay()
    {
        var result = Sensitivity.Marginal(Sample, "salario_base", 100m).Result!;

        // Hazard pay and overtime scale with the base (+138.85 gross); above the INSS ceiling only IRRF bites.
        Assert.Equal("SALARIO_BASE", result.Input);
        Assert.Equal(1.0067m, result.RetainedRatio);
        Assert.Contains(result.Deltas, d => d.Code == "IRRF" && d.Delta > 0);
        Assert.DoesNotContain(result.Deltas, d => d.Code == "INSS");
    }

    [Fact]
    public void Marginal_validates_arguments()
    {
        Assert.False(Sensitivity.Marginal(Sample, "NOPE", 100m).Success);
        Assert.False(Sensitivity.Marginal(Sample, "SALARIO_BASE", 0m).Success);
    }

    [Fact]
    public void Sweep_reveals_bracket_kinks_in_the_net_curve()
    {
        var sheet = PayrollCompiler.Compile(Single("X - faixa(X, IRRF_2025)", new() { ["X"] = 0m })).Sheet!;

        var points = Sensitivity.Sweep(sheet, "X", 2_000m, 6_000m, 5).Points!;

        Assert.Equal([2_000m, 3_000m, 4_000m, 5_000m, 6_000m], points.Select(p => p.X));
        Assert.Null(points[0].MarginalRetained);
        Assert.All(points.Skip(1), p => Assert.InRange(p.MarginalRetained!.Value, 0.70m, 1m));
        Assert.True(points[^1].MarginalRetained < points[1].MarginalRetained);
    }

    [Theory]
    [InlineData(10, 0, 5)]
    [InlineData(0, 10, 1)]
    [InlineData(0, 10, 201)]
    public void Sweep_rejects_invalid_ranges(int from, int to, int points) =>
        Assert.False(Sensitivity.Sweep(Sample, "SALARIO_BASE", from, to, points).Success);

    [Fact]
    public void Sweep_propagates_runtime_errors()
    {
        var sheet = PayrollCompiler.Compile(Single("10 / X", new() { ["X"] = 1m })).Sheet!;

        var result = Sensitivity.Sweep(sheet, "X", -1m, 1m, 3);

        Assert.False(result.Success);
        Assert.Contains("Divisão por zero", result.Diagnostics[0].Message, StringComparison.Ordinal);
    }
}
