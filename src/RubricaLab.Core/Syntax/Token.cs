namespace RubricaLab.Core.Syntax;

public readonly record struct TextSpan(int Start, int Length)
{
    public int End => Start + Length;

    public static TextSpan Cover(TextSpan first, TextSpan last) => new(first.Start, last.End - first.Start);
}

public enum TokenKind
{
    Number,
    Identifier,
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    LeftParen,
    RightParen,
    Comma,
    EqualEqual,
    BangEqual,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
    AndAnd,
    OrOr,
    Bang,
    End,
}

public readonly record struct Token(TokenKind Kind, string Text, TextSpan Span);
