using RubricaLab.Core.Syntax;
using static RubricaLab.Core.Tests.TestSheets;

namespace RubricaLab.Core.Tests.Engine;

public class EvaluatorTests
{
    [Theory]
    [InlineData("1 + 2 * 3", 7)]
    [InlineData("10 / 4", 2.5)]
    [InlineData("200 * 7.5%", 15)]
    [InlineData("-(2 - 5)", 3)]
    [InlineData("3 > 2", 1)]
    [InlineData("3 <= 2", 0)]
    [InlineData("2 == 2 && 1 != 1", 0)]
    [InlineData("0 || 5", 1)]
    [InlineData("!0", 1)]
    [InlineData("min(4, 2, 9)", 2)]
    [InlineData("max(4, 2, 9)", 9)]
    [InlineData("abs(-3.5)", 3.5)]
    [InlineData("limite(15, 0, 10)", 10)]
    [InlineData("limite(-1, 0, 10)", 0)]
    [InlineData("arred(2.345)", 2.35)]
    [InlineData("arred(-2.5, 0)", -3)]
    [InlineData("arred(1.23456, 4)", 1.2346)]
    [InlineData("se(1 > 2, 10, 20)", 20)]
    public void Evaluates_expressions(string formula, double expected) =>
        Assert.Equal((decimal)expected, Value(formula));

    [Fact]
    public void Decimal_arithmetic_has_no_binary_rounding_drift() =>
        Assert.Equal(0.3m, Value("0.1 + 0.2"));

    [Fact]
    public void Names_are_case_insensitive() =>
        Assert.Equal(20m, Value("salario * 2", new() { ["SALARIO"] = 10m }));

    [Fact]
    public void Se_only_evaluates_the_taken_branch() =>
        Assert.Equal(0m, Value("se(X == 0, 0, 100 / X)", new() { ["X"] = 0m }));

    [Fact]
    public void And_short_circuits_before_dividing_by_zero() =>
        Assert.Equal(0m, Value("X != 0 && 100 / X > 1", new() { ["X"] = 0m }));

    [Theory]
    [InlineData("10 / (X - 1)", "Divisão por zero", 6)]
    [InlineData("limite(1, 5, 2)", "mínimo maior que o máximo", 0)]
    [InlineData("arred(1, 2.5)", "casas decimais", 9)]
    public void Runtime_errors_point_at_the_offending_expression(string formula, string message, int position)
    {
        var result = Evaluate(Single(formula, new() { ["X"] = 1m }));

        var diagnostic = Assert.Single(result.Diagnostics);
        Assert.False(result.Success);
        Assert.Equal(DiagnosticCodes.Runtime, diagnostic.Code);
        Assert.Equal("R", diagnostic.Rubric);
        Assert.Contains(message, diagnostic.Message, StringComparison.Ordinal);
        Assert.Equal(position, diagnostic.Span!.Value.Start);
    }

    [Fact]
    public void Overflow_becomes_a_diagnostic()
    {
        var result = Evaluate(Single("79228162514264337593543950335 * 2"));

        Assert.False(result.Success);
        Assert.Equal(DiagnosticCodes.Runtime, Assert.Single(result.Diagnostics).Code);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(1000, 75)]
    [InlineData(1518, 113.85)]
    [InlineData(3000, 253.4136)]
    [InlineData(8157.41, 951.6344)]
    [InlineData(20000, 951.6344)]
    public void Progressive_table_taxes_each_slice_at_its_own_rate(double baseValue, double expected) =>
        Assert.Equal((decimal)expected, Value("progressiva(B, INSS_2025)", new() { ["B"] = (decimal)baseValue }));

    [Theory]
    [InlineData(2000, 0)]
    [InlineData(2428.80, 0)]
    [InlineData(2500, 5.34)]
    [InlineData(3500, 130.84)]
    [InlineData(10000, 1841.27)]
    public void Bracket_table_applies_rate_minus_deduction(double baseValue, double expected) =>
        Assert.Equal((decimal)expected, Value("faixa(B, IRRF_2025)", new() { ["B"] = (decimal)baseValue }));

    [Fact]
    public void Progressive_trace_explains_every_slice_and_the_ceiling()
    {
        var trace = Evaluate(Single("progressiva(B, INSS_2025)", new() { ["B"] = 9000m })).Rubrics[0].Trace;

        Assert.Equal("progressiva(B, INSS_2025)", trace.Label);
        Assert.Contains("teto", trace.Note, StringComparison.Ordinal);
        Assert.Equal(["B", "Faixa 1: R$ 1.518,00 × 7,5%", "Faixa 2: R$ 1.275,88 × 9%", "Faixa 3: R$ 1.396,95 × 12%", "Faixa 4: R$ 3.966,58 × 14%"],
            trace.Children.Select(c => c.Label.Replace('\u00a0', ' ')));
        Assert.Equal(trace.Value, trace.Children.Skip(1).Sum(c => c.Value));
    }

    [Fact]
    public void Trace_marks_inputs_and_links_rubric_references()
    {
        var sheet = Of([Earning("A", "X * 2"), Earning("B", "A + 1")], new() { ["X"] = 5m });

        var b = Evaluate(sheet).Rubrics[1].Trace;

        Assert.Equal("A + 1", b.Label);
        Assert.Equal("A", b.Children[0].Ref);
        Assert.Equal(10m, b.Children[0].Value);
        var a = Evaluate(sheet).Rubrics[0].Trace;
        Assert.Equal("entrada", a.Children[0].Note);
        Assert.Null(a.Children[0].Ref);
    }

    [Fact]
    public void Se_trace_records_which_branch_was_taken()
    {
        var trace = Evaluate(Single("se(1, 2, 3)")).Rubrics[0].Trace;

        Assert.Equal("condição verdadeira", trace.Note);
        Assert.Equal(["1", "2"], trace.Children.Select(c => c.Label));
    }
}
