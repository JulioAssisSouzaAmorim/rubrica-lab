namespace RubricaLab.Core.Engine;

/// <summary>One step of the calculation memory: how a value was obtained.</summary>
public sealed record TraceNode(
    string Label,
    decimal Value,
    IReadOnlyList<TraceNode> Children,
    string? Note = null,
    string? Ref = null)
{
    public static TraceNode Leaf(string label, decimal value, string? note = null, string? reference = null) =>
        new(label, value, [], note, reference);
}
