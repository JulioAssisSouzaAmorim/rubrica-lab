using RubricaLab.Core.Model;

namespace RubricaLab.Core.Samples;

/// <summary>Illustrative CLT payslip using the 2025 INSS and IRRF tables. Not tax advice.</summary>
public static class SampleSheets
{
    public static TaxTable Inss2025 { get; } = new("INSS_2025", "INSS 2025 (progressiva)",
    [
        new(1_518.00m, 0.075m),
        new(2_793.88m, 0.09m),
        new(4_190.83m, 0.12m),
        new(8_157.41m, 0.14m),
    ]);

    public static TaxTable Irrf2025 { get; } = new("IRRF_2025", "IRRF a partir de 05/2025",
    [
        new(2_428.80m, 0m),
        new(2_826.65m, 0.075m, 182.16m),
        new(3_751.05m, 0.15m, 394.16m),
        new(4_664.68m, 0.225m, 675.49m),
        new(null, 0.275m, 908.73m),
    ]);

    public static PayrollSheet Clt2025 { get; } = new(
        [
            new("SALARIO", "Salário base", RubricKind.Earning, "SALARIO_BASE"),
            new("PERICULOSIDADE", "Adicional de periculosidade", RubricKind.Earning, "se(TEM_PERICULOSIDADE, SALARIO_BASE * 30%, 0)"),
            new("VALOR_HORA", "Valor da hora", RubricKind.Info, "arred((SALARIO_BASE + PERICULOSIDADE) / 220, 2)"),
            new("HORA_EXTRA", "Horas extras 50%", RubricKind.Earning, "arred(VALOR_HORA * (1 + 50%) * HORAS_EXTRAS, 2)"),
            new("BASE_INSS", "Base de cálculo do INSS", RubricKind.Base, "SALARIO + PERICULOSIDADE + HORA_EXTRA"),
            new("INSS", "INSS", RubricKind.Deduction, "arred(progressiva(BASE_INSS, INSS_2025), 2)"),
            new("BASE_IRRF", "Base de cálculo do IRRF", RubricKind.Base, "BASE_INSS - max(INSS + DEPENDENTES * 189.59, 607.20)"),
            new("IRRF", "IRRF", RubricKind.Deduction, "arred(faixa(BASE_IRRF, IRRF_2025), 2)"),
            new("FGTS", "FGTS (depósito do empregador)", RubricKind.Info, "arred(BASE_INSS * 8%, 2)"),
        ],
        [Inss2025, Irrf2025],
        new Dictionary<string, decimal>
        {
            ["SALARIO_BASE"] = 6_500m,
            ["TEM_PERICULOSIDADE"] = 1m,
            ["HORAS_EXTRAS"] = 10m,
            ["DEPENDENTES"] = 1m,
        });
}
