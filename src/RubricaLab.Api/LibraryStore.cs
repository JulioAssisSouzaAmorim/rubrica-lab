using System.Text.Json;
using System.Text.Json.Serialization;
using RubricaLab.Core.Engine;
using RubricaLab.Core.Model;
using RubricaLab.Core.Samples;
using RubricaLab.Core.Syntax;

namespace RubricaLab.Api;

public sealed record SavedRubric(Rubric Rubric, bool BuiltIn);

public sealed record SavedTable(TaxTable Table, bool BuiltIn);

public sealed record Library(IReadOnlyList<SavedRubric> Rubrics, IReadOnlyList<SavedTable> Tables);

public enum StoreOutcome
{
    Ok,
    NotFound,
    BuiltIn,
    Invalid,
}

public sealed record StoreResult(StoreOutcome Outcome, string? Error = null);

/// <summary>User-saved rubrics and tables, persisted as a JSON file. The sample sheet's items are read-only defaults.</summary>
public sealed class LibraryStore(string path)
{
    public const int MaxRubrics = 100;
    public const int MaxTables = 20;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly Lock _gate = new();

    private sealed record Stored(List<Rubric> Rubrics, List<TaxTable> Tables);

    public Library List()
    {
        lock (_gate)
        {
            var custom = Load();
            return new Library(
                [
                    .. SampleSheets.Clt2025.Rubrics.Select(r => new SavedRubric(r, true)),
                    .. custom.Rubrics.OrderBy(r => r.Code, StringComparer.Ordinal).Select(r => new SavedRubric(r, false)),
                ],
                [
                    .. SampleSheets.Clt2025.Tables.Select(t => new SavedTable(t, true)),
                    .. custom.Tables.OrderBy(t => t.Code, StringComparer.Ordinal).Select(t => new SavedTable(t, false)),
                ]);
        }
    }

    public StoreResult SaveRubric(Rubric rubric)
    {
        if (!Lexer.IsValidIdentifier(rubric.Code))
        {
            return new(StoreOutcome.Invalid, $"Código inválido: '{rubric.Code}'. Use letras, números e _.");
        }
        if (IsBuiltInRubric(rubric.Code))
        {
            return new(StoreOutcome.BuiltIn, $"'{rubric.Code}' é uma rubrica padrão. Salve com outro código.");
        }
        if (rubric.Formula.Length > PayrollCompiler.MaxFormulaLength)
        {
            return new(StoreOutcome.Invalid, $"Fórmula com mais de {PayrollCompiler.MaxFormulaLength} caracteres.");
        }
        try
        {
            Parser.Parse(rubric.Formula);
        }
        catch (DslException ex)
        {
            return new(StoreOutcome.Invalid, $"A fórmula tem um erro: {ex.Diagnostic.Message}");
        }

        lock (_gate)
        {
            var stored = Load();
            var replaced = stored.Rubrics.RemoveAll(r => Same(r.Code, rubric.Code)) > 0;
            if (!replaced && stored.Rubrics.Count >= MaxRubrics)
            {
                return new(StoreOutcome.Invalid, $"Limite de {MaxRubrics} rubricas salvas.");
            }
            stored.Rubrics.Add(rubric);
            Save(stored);
        }
        return new(StoreOutcome.Ok);
    }

    public StoreResult SaveTable(TaxTable table)
    {
        if (IsBuiltInTable(table.Code))
        {
            return new(StoreOutcome.BuiltIn, $"'{table.Code}' é uma tabela padrão. Salve com outro código.");
        }
        if (PayrollCompiler.ValidateTable(table) is { } problem)
        {
            return new(StoreOutcome.Invalid, $"Tabela inválida: {problem}");
        }

        lock (_gate)
        {
            var stored = Load();
            var replaced = stored.Tables.RemoveAll(t => Same(t.Code, table.Code)) > 0;
            if (!replaced && stored.Tables.Count >= MaxTables)
            {
                return new(StoreOutcome.Invalid, $"Limite de {MaxTables} tabelas salvas.");
            }
            stored.Tables.Add(table);
            Save(stored);
        }
        return new(StoreOutcome.Ok);
    }

    public StoreResult DeleteRubric(string code) =>
        IsBuiltInRubric(code) ? new(StoreOutcome.BuiltIn, "Rubricas padrão não podem ser excluídas.") : Delete(s => s.Rubrics.RemoveAll(r => Same(r.Code, code)));

    public StoreResult DeleteTable(string code) =>
        IsBuiltInTable(code) ? new(StoreOutcome.BuiltIn, "Tabelas padrão não podem ser excluídas.") : Delete(s => s.Tables.RemoveAll(t => Same(t.Code, code)));

    private StoreResult Delete(Func<Stored, int> remove)
    {
        lock (_gate)
        {
            var stored = Load();
            if (remove(stored) == 0)
            {
                return new(StoreOutcome.NotFound, "Item não encontrado.");
            }
            Save(stored);
            return new(StoreOutcome.Ok);
        }
    }

    private static bool Same(string a, string b) => string.Equals(a, b, StringComparison.OrdinalIgnoreCase);

    private static bool IsBuiltInRubric(string code) => SampleSheets.Clt2025.Rubrics.Any(r => Same(r.Code, code));

    private static bool IsBuiltInTable(string code) => SampleSheets.Clt2025.Tables.Any(t => Same(t.Code, code));

    private Stored Load()
    {
        if (!File.Exists(path))
        {
            return new([], []);
        }
        return JsonSerializer.Deserialize<Stored>(File.ReadAllText(path), Json) ?? new([], []);
    }

    private void Save(Stored stored)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        var temp = path + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(stored, Json));
        File.Move(temp, path, overwrite: true);
    }
}
