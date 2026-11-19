namespace RubricaLab.Core.Model;

public enum RubricKind
{
    Earning,
    Deduction,
    Base,
    Info,
}

public sealed record Rubric(string Code, string Description, RubricKind Kind, string Formula);

/// <summary>A bracket with a null <see cref="UpTo"/> is open-ended.</summary>
public sealed record Bracket(decimal? UpTo, decimal Rate, decimal Deduction = 0);

public sealed record TaxTable(string Code, string Description, IReadOnlyList<Bracket> Brackets);

public sealed record PayrollSheet(
    IReadOnlyList<Rubric> Rubrics,
    IReadOnlyList<TaxTable> Tables,
    IReadOnlyDictionary<string, decimal> Inputs);
