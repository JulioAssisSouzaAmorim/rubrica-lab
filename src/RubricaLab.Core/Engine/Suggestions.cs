namespace RubricaLab.Core.Engine;

internal static class Suggestions
{
    public static string? Closest(string name, IEnumerable<string> candidates, int maxDistance = 2) =>
        candidates
            .Select(c => (Candidate: c, Distance: Distance(name.ToUpperInvariant(), c.ToUpperInvariant())))
            .Where(x => x.Distance <= maxDistance)
            .OrderBy(x => x.Distance)
            .ThenBy(x => x.Candidate, StringComparer.Ordinal)
            .Select(x => x.Candidate)
            .FirstOrDefault();

    internal static int Distance(string a, string b)
    {
        var previous = Enumerable.Range(0, b.Length + 1).ToArray();
        var current = new int[b.Length + 1];
        for (var i = 1; i <= a.Length; i++)
        {
            current[0] = i;
            for (var j = 1; j <= b.Length; j++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                current[j] = Math.Min(Math.Min(current[j - 1] + 1, previous[j] + 1), previous[j - 1] + cost);
            }
            (previous, current) = (current, previous);
        }
        return previous[b.Length];
    }
}
