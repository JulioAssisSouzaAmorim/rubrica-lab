namespace RubricaLab.Core.Syntax;

public static class Lexer
{
    public static IReadOnlyList<Token> Tokenize(string source)
    {
        ArgumentNullException.ThrowIfNull(source);

        var tokens = new List<Token>();
        var i = 0;

        while (i < source.Length)
        {
            var c = source[i];
            if (char.IsWhiteSpace(c))
            {
                i++;
                continue;
            }

            var start = i;

            if (char.IsAsciiDigit(c))
            {
                i = SkipDigits(source, i);
                if (i + 1 < source.Length && source[i] == '.' && char.IsAsciiDigit(source[i + 1]))
                {
                    i = SkipDigits(source, i + 1);
                }
                tokens.Add(new Token(TokenKind.Number, source[start..i], new TextSpan(start, i - start)));
                continue;
            }

            if (IsIdentifierStart(c))
            {
                while (i < source.Length && IsIdentifierPart(source[i]))
                {
                    i++;
                }
                tokens.Add(new Token(TokenKind.Identifier, source[start..i], new TextSpan(start, i - start)));
                continue;
            }

            var next = i + 1 < source.Length ? source[i + 1] : '\0';
            var (kind, length) = (c, next) switch
            {
                ('+', _) => (TokenKind.Plus, 1),
                ('-', _) => (TokenKind.Minus, 1),
                ('*', _) => (TokenKind.Star, 1),
                ('/', _) => (TokenKind.Slash, 1),
                ('%', _) => (TokenKind.Percent, 1),
                ('(', _) => (TokenKind.LeftParen, 1),
                (')', _) => (TokenKind.RightParen, 1),
                (',', _) => (TokenKind.Comma, 1),
                ('=', '=') => (TokenKind.EqualEqual, 2),
                ('!', '=') => (TokenKind.BangEqual, 2),
                ('!', _) => (TokenKind.Bang, 1),
                ('<', '=') => (TokenKind.LessEqual, 2),
                ('<', _) => (TokenKind.Less, 1),
                ('>', '=') => (TokenKind.GreaterEqual, 2),
                ('>', _) => (TokenKind.Greater, 1),
                ('&', '&') => (TokenKind.AndAnd, 2),
                ('|', '|') => (TokenKind.OrOr, 2),
                _ => throw new DslException(new Diagnostic(
                    DiagnosticCodes.UnexpectedCharacter,
                    $"Caractere inesperado '{c}'.",
                    new TextSpan(i, 1))),
            };

            tokens.Add(new Token(kind, source.Substring(i, length), new TextSpan(i, length)));
            i += length;
        }

        tokens.Add(new Token(TokenKind.End, string.Empty, new TextSpan(source.Length, 0)));
        return tokens;
    }

    public static bool IsValidIdentifier(string? name) =>
        !string.IsNullOrEmpty(name) && IsIdentifierStart(name[0]) && name.All(IsIdentifierPart);

    private static int SkipDigits(string source, int i)
    {
        while (i < source.Length && char.IsAsciiDigit(source[i]))
        {
            i++;
        }
        return i;
    }

    private static bool IsIdentifierStart(char c) => char.IsLetter(c) || c == '_';

    private static bool IsIdentifierPart(char c) => char.IsLetterOrDigit(c) || c == '_';
}
