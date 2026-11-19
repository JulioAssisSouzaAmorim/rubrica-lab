using RubricaLab.Core.Engine;
using RubricaLab.Core.Samples;

namespace RubricaLab.Core.Tests.Engine;

public class SampleSheetTests
{
    private static readonly CompiledSheet Sheet = PayrollCompiler.Compile(SampleSheets.Clt2025).Sheet!;

    [Fact]
    public void Matches_hand_computed_payslip()
    {
        var result = Sheet.Evaluate();
        var values = result.Rubrics.ToDictionary(r => r.Code, r => r.Value);

        Assert.Equal(1_950.00m, values["PERICULOSIDADE"]);
        Assert.Equal(38.41m, values["VALOR_HORA"]);
        Assert.Equal(576.15m, values["HORA_EXTRA"]);
        Assert.Equal(9_026.15m, values["BASE_INSS"]);
        Assert.Equal(951.63m, values["INSS"]);
        Assert.Equal(7_884.93m, values["BASE_IRRF"]);
        Assert.Equal(1_259.63m, values["IRRF"]);
        Assert.Equal(722.09m, values["FGTS"]);
        Assert.Equal(new Totals(9_026.15m, 2_211.26m, 6_814.89m), result.Totals);
    }

    [Fact]
    public void Uses_simplified_discount_when_it_beats_legal_deductions()
    {
        var result = Sheet.Evaluate(new Dictionary<string, decimal>
        {
            ["SALARIO_BASE"] = 3_000m,
            ["TEM_PERICULOSIDADE"] = 0m,
            ["HORAS_EXTRAS"] = 0m,
            ["DEPENDENTES"] = 0m,
        });
        var values = result.Rubrics.ToDictionary(r => r.Code, r => r.Value);

        Assert.Equal(253.41m, values["INSS"]);
        Assert.Equal(3_000m - 607.20m, values["BASE_IRRF"]);
        Assert.Equal(0m, values["IRRF"]);
    }
}
