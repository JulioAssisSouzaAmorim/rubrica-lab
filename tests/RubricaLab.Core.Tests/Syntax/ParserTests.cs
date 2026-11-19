using RubricaLab.Core.Syntax;

namespace RubricaLab.Core.Tests.Syntax;

public class ParserTests
{
    private static string Shape(Expr expr) => expr switch
    {
        NumberExpr n => n.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),
        NameExpr n => n.Name,
        UnaryExpr u => $"({Op(u.Operator)}{Shape(u.Operand)})",
        PercentExpr p => $"({Shape(p.Operand)}%)",
        BinaryExpr b => $"({Shape(b.Left)} {Op(b.Operator)} {Shape(b.Right)})",
        CallExpr c => $"{c.Function}[{string.Join(", ", c.Arguments.Select(Shape))}]",
        _ => "?",
    };

    private static string Op(TokenKind kind) => kind switch
    {
        TokenKind.Plus => "+",
        TokenKind.Minus => "-",
        TokenKind.Star => "*",
        TokenKind.Slash => "/",
        TokenKind.Less => "<",
        TokenKind.EqualEqual => "==",
        TokenKind.AndAnd => "&&",
        TokenKind.OrOr => "||",
        TokenKind.Bang => "!",
        _ => kind.ToString(),
    };

    [Theory]
    [InlineData("1 + 2 * 3", "(1 + (2 * 3))")]
    [InlineData("(1 + 2) * 3", "((1 + 2) * 3)")]
    [InlineData("10 - 4 - 3", "((10 - 4) - 3)")]
    [InlineData("8 / 4 / 2", "((8 / 4) / 2)")]
    [InlineData("-A * B", "((-A) * B)")]
    [InlineData("A * 30%", "(A * (30%))")]
    [InlineData("-5%", "(-(5%))")]
    [InlineData("A < B == 1", "((A < B) == 1)")]
    [InlineData("A || B && C", "(A || (B && C))")]
    [InlineData("!A && B", "((!A) && B)")]
    [InlineData("max(A, B + 1, 3)", "max[A, (B + 1), 3]")]
    [InlineData("f()", "f[]")]
    public void Respects_precedence_and_associativity(string source, string expected) =>
        Assert.Equal(expected, Shape(Parser.Parse(source)));

    [Fact]
    public void Spans_cover_the_source_of_each_node()
    {
        const string source = "arred(A * 2, 2) + B";
        var root = (BinaryExpr)Parser.Parse(source);
        var call = (CallExpr)root.Left;

        Assert.Equal(source, source.Substring(root.Span.Start, root.Span.Length));
        Assert.Equal("arred(A * 2, 2)", source.Substring(call.Span.Start, call.Span.Length));
        Assert.Equal("arred", source.Substring(call.NameSpan.Start, call.NameSpan.Length));
    }

    [Theory]
    [InlineData("", 0, "fim da fórmula")]
    [InlineData("1 +", 3, "fim da fórmula")]
    [InlineData("(1 + 2", 6, "')'")]
    [InlineData("1 2", 2, "'2'")]
    [InlineData("max(1,)", 6, "')'")]
    [InlineData("* 2", 0, "'*'")]
    public void Reports_unexpected_tokens_with_position(string source, int position, string fragment)
    {
        var ex = Assert.Throws<DslException>(() => Parser.Parse(source));

        Assert.Equal(DiagnosticCodes.UnexpectedToken, ex.Diagnostic.Code);
        Assert.Equal(position, ex.Diagnostic.Span!.Value.Start);
        Assert.Contains(fragment, ex.Diagnostic.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Rejects_numbers_beyond_decimal_range()
    {
        var ex = Assert.Throws<DslException>(() => Parser.Parse(new string('9', 40)));
        Assert.Contains("fora do intervalo", ex.Diagnostic.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Limits_nesting_depth_instead_of_overflowing_the_stack()
    {
        var source = new string('(', 10_000) + "1" + new string(')', 10_000);

        var ex = Assert.Throws<DslException>(() => Parser.Parse(source));
        Assert.Equal(DiagnosticCodes.TooComplex, ex.Diagnostic.Code);
    }

    [Fact]
    public void Accepts_nesting_up_to_the_limit()
    {
        var depth = Parser.MaxDepth - 1;
        var source = new string('(', depth) + "1" + new string(')', depth);

        Assert.IsType<NumberExpr>(Parser.Parse(source));
    }
}
