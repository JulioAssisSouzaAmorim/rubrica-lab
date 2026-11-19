using RubricaLab.Core.Engine;
using RubricaLab.Core.Model;
using RubricaLab.Core.Syntax;
using static RubricaLab.Core.Tests.TestSheets;

namespace RubricaLab.Core.Tests.Engine;

public class CompilerTests
{
    private static IReadOnlyList<Diagnostic> Diagnostics(PayrollSheet sheet)
    {
        var result = PayrollCompiler.Compile(sheet);
        Assert.False(result.Success);
        return result.Diagnostics;
    }

    [Fact]
    public void Orders_rubrics_by_dependency_and_keeps_declaration_order_for_ties()
    {
        var sheet = Of([
            Deduction("LIQ", "BRUTO - DESC"),
            Earning("BRUTO", "A + B"),
            Earning("A", "1"),
            Deduction("DESC", "BRUTO * 10%"),
            Earning("B", "2"),
        ]);

        var compiled = PayrollCompiler.Compile(sheet).Sheet!;

        Assert.Equal(["A", "B", "BRUTO", "DESC", "LIQ"], compiled.Order);
    }

    [Fact]
    public void Results_follow_declaration_order_and_list_dependencies()
    {
        var result = Evaluate(Of([Earning("TOTAL", "B + A"), Earning("A", "1"), Earning("B", "2")]));

        Assert.Equal(["TOTAL", "A", "B"], result.Rubrics.Select(r => r.Code));
        Assert.Equal(["A", "B"], result.Rubrics[0].DependsOn);
        Assert.Equal(["A", "B", "TOTAL"], result.Order);
    }

    [Fact]
    public void Totals_sum_earnings_and_deductions_only()
    {
        var result = Evaluate(Of([
            Earning("A", "100"),
            Deduction("D", "30"),
            new Rubric("BASE", "Base", RubricKind.Base, "A"),
            new Rubric("INFO", "Info", RubricKind.Info, "999"),
        ]));

        Assert.Equal(new Totals(100m, 30m, 70m), result.Totals);
    }

    [Fact]
    public void Reports_the_full_cycle_path()
    {
        var diagnostic = Assert.Single(Diagnostics(Of([
            Earning("A", "B + 1"),
            Earning("B", "C + 1"),
            Earning("C", "A + 1"),
            Earning("D", "A"),
        ])));

        Assert.Equal(DiagnosticCodes.Cycle, diagnostic.Code);
        Assert.Equal("Dependência circular: A → B → C → A.", diagnostic.Message);
    }

    [Fact]
    public void Reports_self_reference_as_cycle()
    {
        var diagnostic = Assert.Single(Diagnostics(Of([Earning("A", "a * 2")])));
        Assert.Equal("Dependência circular: A → A.", diagnostic.Message);
    }

    [Fact]
    public void Reports_each_independent_cycle_once()
    {
        var cycles = Diagnostics(Of([
            Earning("A", "B"),
            Earning("B", "A"),
            Earning("C", "D"),
            Earning("D", "C"),
        ]));

        Assert.Equal(2, cycles.Count);
        Assert.All(cycles, d => Assert.Equal(DiagnosticCodes.Cycle, d.Code));
    }

    [Fact]
    public void Collects_every_unknown_name_with_suggestions()
    {
        var problems = Diagnostics(Of([Earning("R", "SALARO + BONUS + INSS_2025")], new() { ["SALARIO"] = 1m }));

        Assert.Equal(3, problems.Count);
        Assert.All(problems, p => Assert.Equal("R", p.Rubric));
        Assert.Contains("Você quis dizer 'SALARIO'?", problems[0].Message, StringComparison.Ordinal);
        Assert.Equal(new TextSpan(0, 6), problems[0].Span);
        Assert.DoesNotContain("Você quis dizer", problems[1].Message, StringComparison.Ordinal);
        Assert.Contains("é uma tabela", problems[2].Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("maxx(1, 2)", DiagnosticCodes.UnknownFunction, "Você quis dizer 'max'?")]
    [InlineData("se(1, 2)", DiagnosticCodes.Arity, "recebeu 2 argumento(s)")]
    [InlineData("progressiva(100, TABELA_X)", DiagnosticCodes.UnknownTable, "argumento 2")]
    [InlineData("faixa(100, 1 + 1)", DiagnosticCodes.UnknownTable, "código de uma tabela")]
    [InlineData("1 +", DiagnosticCodes.UnexpectedToken, "fim da fórmula")]
    public void Reports_formula_problems(string formula, string code, string fragment)
    {
        var diagnostic = Assert.Single(Diagnostics(Single(formula)));

        Assert.Equal(code, diagnostic.Code);
        Assert.Contains(fragment, diagnostic.Message, StringComparison.Ordinal);
        Assert.Equal("R", diagnostic.Rubric);
    }

    [Fact]
    public void Parse_error_in_a_dependency_does_not_break_the_graph()
    {
        var diagnostic = Assert.Single(Diagnostics(Of([Earning("A", "("), Earning("B", "A * 2")])));

        Assert.Equal(DiagnosticCodes.UnexpectedToken, diagnostic.Code);
        Assert.Equal("A", diagnostic.Rubric);
    }

    [Fact]
    public void Rejects_overly_long_formulas() =>
        Assert.Equal(DiagnosticCodes.TooComplex, Assert.Single(Diagnostics(Single(new string('1', 2_001)))).Code);

    [Fact]
    public void Rejects_duplicate_and_clashing_names()
    {
        var problems = Diagnostics(Of(
            [Earning("A", "1"), Earning("a", "2"), Earning("X", "3"), Earning("INSS_2025", "4"), Earning("9X", "5")],
            new() { ["X"] = 0m }));

        Assert.Equal(
            [DiagnosticCodes.DuplicateName, DiagnosticCodes.DuplicateName, DiagnosticCodes.DuplicateName, DiagnosticCodes.InvalidName],
            problems.Select(p => p.Code));
    }

    [Theory]
    [InlineData("precisa de ao menos uma faixa")]
    [InlineData("alíquota da faixa 1")]
    [InlineData("apenas a última faixa")]
    [InlineData("positivos e crescentes")]
    public void Validates_tables(string fragment)
    {
        IReadOnlyList<Bracket> brackets = fragment switch
        {
            "precisa de ao menos uma faixa" => [],
            "alíquota da faixa 1" => [new(100m, 1.5m)],
            "apenas a última faixa" => [new(null, 0.1m), new(200m, 0.2m)],
            _ => [new(200m, 0.1m), new(100m, 0.2m)],
        };
        var sheet = new PayrollSheet([Earning("A", "1")], [new TaxTable("T", "T", brackets)], new Dictionary<string, decimal>());

        var diagnostic = Assert.Single(Diagnostics(sheet));
        Assert.Equal(DiagnosticCodes.InvalidTable, diagnostic.Code);
        Assert.Contains(fragment, diagnostic.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Overrides_replace_inputs_without_recompiling()
    {
        var compiled = PayrollCompiler.Compile(Single("X * 2", new() { ["X"] = 1m })).Sheet!;

        Assert.Equal(2m, compiled.Evaluate().Rubrics[0].Value);
        Assert.Equal(20m, compiled.Evaluate(new Dictionary<string, decimal> { ["x"] = 10m }).Rubrics[0].Value);
        Assert.False(compiled.Evaluate(new Dictionary<string, decimal> { ["Y"] = 1m }).Success);
    }

    [Theory]
    [InlineData("SALARIO", "SALARO", 1)]
    [InlineData("INSS", "IRRF", 3)]
    [InlineData("", "ABC", 3)]
    public void Edit_distance(string a, string b, int expected) =>
        Assert.Equal(expected, Suggestions.Distance(a, b));
}
