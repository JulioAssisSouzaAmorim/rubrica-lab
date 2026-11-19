namespace RubricaLab.Core.Engine;

internal static class RubricGraph
{
    /// <summary>
    /// Kahn's algorithm with ties broken by declaration order. Dependencies outside <paramref name="nodes"/>
    /// (rubrics that failed to parse) are ignored; whatever is left over sits on or behind a cycle.
    /// </summary>
    public static (IReadOnlyList<string> Order, IReadOnlyList<IReadOnlyList<string>> Cycles) Sort(
        IReadOnlyList<string> nodes,
        IReadOnlyDictionary<string, IReadOnlySet<string>> dependencies)
    {
        var index = nodes.Select((n, i) => (n, i)).ToDictionary(x => x.n, x => x.i, StringComparer.OrdinalIgnoreCase);
        var pending = nodes.ToDictionary(n => n, n => dependencies[n].Count(index.ContainsKey), StringComparer.OrdinalIgnoreCase);
        var dependents = nodes.ToDictionary(n => n, _ => new List<string>(), StringComparer.OrdinalIgnoreCase);
        foreach (var node in nodes)
        {
            foreach (var dependency in dependencies[node].Where(index.ContainsKey))
            {
                dependents[dependency].Add(node);
            }
        }

        var ready = new PriorityQueue<string, int>();
        foreach (var node in nodes.Where(n => pending[n] == 0))
        {
            ready.Enqueue(node, index[node]);
        }

        var order = new List<string>(nodes.Count);
        while (ready.TryDequeue(out var node, out _))
        {
            order.Add(node);
            foreach (var dependent in dependents[node])
            {
                if (--pending[dependent] == 0)
                {
                    ready.Enqueue(dependent, index[dependent]);
                }
            }
        }

        var leftover = nodes.Where(n => pending[n] > 0).ToList();
        return (order, FindCycles(leftover, dependencies));
    }

    private static List<IReadOnlyList<string>> FindCycles(
        List<string> leftover,
        IReadOnlyDictionary<string, IReadOnlySet<string>> dependencies)
    {
        var cycles = new List<IReadOnlyList<string>>();
        var remaining = new HashSet<string>(leftover, StringComparer.OrdinalIgnoreCase);
        var reported = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var start in leftover.Where(n => !reported.Contains(n)))
        {
            // Every leftover node has a leftover dependency, so walking forward must revisit a node.
            var path = new List<string>();
            var position = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var current = start;
            while (!position.ContainsKey(current))
            {
                position[current] = path.Count;
                path.Add(current);
                current = dependencies[current].First(remaining.Contains);
            }

            var cycle = path[position[current]..];
            if (cycle.Any(reported.Contains))
            {
                continue;
            }
            reported.UnionWith(cycle);
            cycles.Add([.. cycle, current]);
        }

        return cycles;
    }
}
