namespace RubricaLab.Core.Syntax;

public sealed record Diagnostic(string Code, string Message, TextSpan? Span = null, string? Rubric = null);

public static class DiagnosticCodes
{
    public const string UnexpectedCharacter = "RL001";
    public const string UnexpectedToken = "RL002";
    public const string UnknownIdentifier = "RL003";
    public const string Cycle = "RL004";
    public const string DuplicateName = "RL005";
    public const string UnknownFunction = "RL006";
    public const string Arity = "RL007";
    public const string UnknownTable = "RL008";
    public const string Runtime = "RL009";
    public const string InvalidName = "RL010";
    public const string TooComplex = "RL011";
    public const string InvalidTable = "RL012";
}

public sealed class DslException(Diagnostic diagnostic) : Exception(diagnostic.Message)
{
    public Diagnostic Diagnostic { get; } = diagnostic;
}
