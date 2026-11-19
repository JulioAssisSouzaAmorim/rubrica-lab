using System.Globalization;

namespace RubricaLab.Core.Syntax;

/// <summary>Pratt parser for rubric formulas.</summary>
public sealed class Parser
{
    public const int MaxDepth = 64;
    private const int UnaryPrecedence = 7;

    private readonly IReadOnlyList<Token> _tokens;
    private int _position;
    private int _depth;

    private Parser(IReadOnlyList<Token> tokens) => _tokens = tokens;

    public static Expr Parse(string source)
    {
        var parser = new Parser(Lexer.Tokenize(source));
        var expr = parser.ParseExpression(0);
        parser.Expect(TokenKind.End, "operador ou fim da fórmula");
        return expr;
    }

    private Token Current => _tokens[_position];

    private Token Advance() => _tokens[_position++];

    private Expr ParseExpression(int minPrecedence)
    {
        if (++_depth > MaxDepth)
        {
            throw Error(DiagnosticCodes.TooComplex, $"Fórmula aninhada demais (limite de {MaxDepth} níveis).", Current.Span);
        }

        var left = ParsePrefix();

        while (true)
        {
            var op = Current;
            if (op.Kind == TokenKind.Percent)
            {
                Advance();
                left = new PercentExpr(left, TextSpan.Cover(left.Span, op.Span));
                continue;
            }

            var precedence = BinaryPrecedence(op.Kind);
            if (precedence <= minPrecedence)
            {
                break;
            }

            Advance();
            var right = ParseExpression(precedence);
            left = new BinaryExpr(left, op.Kind, right, TextSpan.Cover(left.Span, right.Span));
        }

        _depth--;
        return left;
    }

    private Expr ParsePrefix()
    {
        var token = Advance();
        switch (token.Kind)
        {
            case TokenKind.Number:
                if (!decimal.TryParse(token.Text, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value))
                {
                    throw Error(DiagnosticCodes.UnexpectedToken, $"Número fora do intervalo suportado: {token.Text}.", token.Span);
                }
                return new NumberExpr(value, token.Span);

            case TokenKind.Identifier when Current.Kind == TokenKind.LeftParen:
                return ParseCall(token);

            case TokenKind.Identifier:
                return new NameExpr(token.Text, token.Span);

            case TokenKind.LeftParen:
                var inner = ParseExpression(0);
                Expect(TokenKind.RightParen, "')'");
                return inner;

            case TokenKind.Minus or TokenKind.Bang:
                var operand = ParseExpression(UnaryPrecedence);
                return new UnaryExpr(token.Kind, operand, TextSpan.Cover(token.Span, operand.Span));

            default:
                throw Unexpected(token, "um valor, nome ou '('");
        }
    }

    private CallExpr ParseCall(Token name)
    {
        Advance();
        var arguments = new List<Expr>();
        if (Current.Kind != TokenKind.RightParen)
        {
            arguments.Add(ParseExpression(0));
            while (Current.Kind == TokenKind.Comma)
            {
                Advance();
                arguments.Add(ParseExpression(0));
            }
        }

        var close = Expect(TokenKind.RightParen, "',' ou ')'");
        return new CallExpr(name.Text, name.Span, arguments, TextSpan.Cover(name.Span, close.Span));
    }

    private Token Expect(TokenKind kind, string description)
    {
        if (Current.Kind != kind)
        {
            throw Unexpected(Current, description);
        }
        return Advance();
    }

    private static int BinaryPrecedence(TokenKind kind) => kind switch
    {
        TokenKind.OrOr => 1,
        TokenKind.AndAnd => 2,
        TokenKind.EqualEqual or TokenKind.BangEqual => 3,
        TokenKind.Less or TokenKind.LessEqual or TokenKind.Greater or TokenKind.GreaterEqual => 4,
        TokenKind.Plus or TokenKind.Minus => 5,
        TokenKind.Star or TokenKind.Slash => 6,
        _ => 0,
    };

    private static DslException Unexpected(Token token, string expected)
    {
        var found = token.Kind == TokenKind.End ? "fim da fórmula" : $"'{token.Text}'";
        return Error(DiagnosticCodes.UnexpectedToken, $"Esperado {expected}, encontrado {found}.", token.Span);
    }

    private static DslException Error(string code, string message, TextSpan span) =>
        new(new Diagnostic(code, message, span));
}
