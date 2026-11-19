namespace RubricaLab.Core.Syntax;

public abstract record Expr(TextSpan Span);

public sealed record NumberExpr(decimal Value, TextSpan Span) : Expr(Span);

public sealed record NameExpr(string Name, TextSpan Span) : Expr(Span);

public sealed record UnaryExpr(TokenKind Operator, Expr Operand, TextSpan Span) : Expr(Span);

public sealed record PercentExpr(Expr Operand, TextSpan Span) : Expr(Span);

public sealed record BinaryExpr(Expr Left, TokenKind Operator, Expr Right, TextSpan Span) : Expr(Span);

public sealed record CallExpr(string Function, TextSpan NameSpan, IReadOnlyList<Expr> Arguments, TextSpan Span) : Expr(Span);
