namespace RubricaLab.Core.Engine;

public sealed record FunctionInfo(
    string Name,
    int MinArgs,
    int MaxArgs,
    string Signature,
    string Description,
    int? TableArgument = null);

public static class Builtins
{
    private const int Variadic = 32;

    public static IReadOnlyDictionary<string, FunctionInfo> All { get; } = new FunctionInfo[]
    {
        new("min", 1, Variadic, "min(a, b, ...)", "Menor dos valores."),
        new("max", 1, Variadic, "max(a, b, ...)", "Maior dos valores."),
        new("abs", 1, 1, "abs(x)", "Valor absoluto."),
        new("arred", 1, 2, "arred(x, casas = 2)", "Arredondamento comercial (meio para cima)."),
        new("limite", 3, 3, "limite(x, minimo, maximo)", "Restringe x ao intervalo."),
        new("se", 3, 3, "se(condicao, entao, senao)", "Avalia apenas o ramo escolhido."),
        new("progressiva", 2, 2, "progressiva(base, TABELA)", "Aplica cada alíquota à parcela da base em sua faixa (ex.: INSS).", 1),
        new("faixa", 2, 2, "faixa(base, TABELA)", "Alíquota da faixa sobre a base menos a parcela a deduzir (ex.: IRRF).", 1),
    }.ToDictionary(f => f.Name, StringComparer.OrdinalIgnoreCase);
}
