using RubricaLab.Core.Syntax;

namespace RubricaLab.Core.Tests.Syntax;

public class LexerTests
{
    [Fact]
    public void Tokenizes_numbers_names_and_operators_with_spans()
    {
        var tokens = Lexer.Tokenize("SALARIO * 7.5% >= 10");

        Assert.Equal(
            [TokenKind.Identifier, TokenKind.Star, TokenKind.Number, TokenKind.Percent, TokenKind.GreaterEqual, TokenKind.Number, TokenKind.End],
            tokens.Select(t => t.Kind));
        Assert.Equal(new TextSpan(10, 3), tokens[2].Span);
        Assert.Equal("7.5", tokens[2].Text);
    }

    [Theory]
    [InlineData("==", TokenKind.EqualEqual)]
    [InlineData("!=", TokenKind.BangEqual)]
    [InlineData("<=", TokenKind.LessEqual)]
    [InlineData("<", TokenKind.Less)]
    [InlineData(">", TokenKind.Greater)]
    [InlineData("&&", TokenKind.AndAnd)]
    [InlineData("||", TokenKind.OrOr)]
    [InlineData("!", TokenKind.Bang)]
    public void Recognizes_compound_operators(string text, TokenKind expected) =>
        Assert.Equal(expected, Lexer.Tokenize(text)[0].Kind);

    [Fact]
    public void Accepts_accented_identifiers() =>
        Assert.Equal("SALÁRIO_13", Lexer.Tokenize("SALÁRIO_13")[0].Text);

    [Fact]
    public void Trailing_dot_is_not_part_of_number()
    {
        var ex = Assert.Throws<DslException>(() => Lexer.Tokenize("10."));
        Assert.Equal(new TextSpan(2, 1), ex.Diagnostic.Span);
    }

    [Theory]
    [InlineData("a & b", 2)]
    [InlineData("a = b", 2)]
    [InlineData("salario $", 8)]
    public void Reports_position_of_unexpected_character(string source, int position)
    {
        var ex = Assert.Throws<DslException>(() => Lexer.Tokenize(source));
        Assert.Equal(DiagnosticCodes.UnexpectedCharacter, ex.Diagnostic.Code);
        Assert.Equal(position, ex.Diagnostic.Span!.Value.Start);
    }

    [Theory]
    [InlineData("INSS", true)]
    [InlineData("_tmp1", true)]
    [InlineData("1ABC", false)]
    [InlineData("A-B", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void Validates_identifiers(string? name, bool valid) =>
        Assert.Equal(valid, Lexer.IsValidIdentifier(name));
}
