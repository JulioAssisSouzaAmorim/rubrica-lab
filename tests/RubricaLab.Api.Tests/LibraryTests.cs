using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;

namespace RubricaLab.Api.Tests;

public sealed class LibraryTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly string _file = Path.Combine(Path.GetTempPath(), $"rubrica-lab-{Guid.NewGuid():N}.json");
    private readonly HttpClient _client;

    public LibraryTests(WebApplicationFactory<Program> factory) =>
        _client = factory.WithWebHostBuilder(b => b.UseSetting("Library:Path", _file)).CreateClient();

    public void Dispose()
    {
        _client.Dispose();
        File.Delete(_file);
    }

    private static object Rubric(string code, string formula = "SALARIO * 10%") =>
        new { code, description = "Bônus", kind = "Earning", formula };

    private static object Table(string code, decimal upTo = 1000m) => new
    {
        code,
        description = "Minha tabela",
        brackets = new object[] { new { upTo, rate = 0.1m, deduction = 0m }, new { upTo = (decimal?)null, rate = 0.2m, deduction = 50m } },
    };

    private async Task<JsonNode> Library() => (await _client.GetFromJsonAsync<JsonNode>("/api/library"))!;

    [Fact]
    public async Task Lists_defaults_as_built_in()
    {
        var library = await Library();

        var rubrics = library["rubrics"]!.AsArray();
        Assert.Equal(9, rubrics.Count);
        Assert.All(rubrics, r => Assert.True((bool)r!["builtIn"]!));
        Assert.Equal("INSS_2025", (string)library["tables"]![0]!["table"]!["code"]!);
    }

    [Fact]
    public async Task Saves_updates_lists_and_deletes_a_rubric()
    {
        Assert.Equal(HttpStatusCode.NoContent, (await _client.PostAsJsonAsync("/api/library/rubrics", Rubric("BONUS"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.PostAsJsonAsync("/api/library/rubrics", Rubric("bonus", "100"))).StatusCode);

        var custom = (await Library())["rubrics"]!.AsArray().Where(r => !(bool)r!["builtIn"]!).ToList();
        var saved = Assert.Single(custom)!;
        Assert.Equal("100", (string)saved["rubric"]!["formula"]!);
        Assert.True(File.Exists(_file));

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync(new Uri("/api/library/rubrics/BONUS", UriKind.Relative))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.DeleteAsync(new Uri("/api/library/rubrics/BONUS", UriKind.Relative))).StatusCode);
    }

    [Fact]
    public async Task Built_in_items_cannot_be_overwritten_or_deleted()
    {
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync("/api/library/rubrics", Rubric("INSS"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.DeleteAsync(new Uri("/api/library/rubrics/inss", UriKind.Relative))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync("/api/library/tables", Table("IRRF_2025"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.DeleteAsync(new Uri("/api/library/tables/IRRF_2025", UriKind.Relative))).StatusCode);
    }

    [Theory]
    [InlineData("9X", "1", "Código inválido")]
    [InlineData("OK", "1 +", "fórmula tem um erro")]
    public async Task Rejects_invalid_rubrics_with_a_readable_message(string code, string formula, string fragment)
    {
        var response = await _client.PostAsJsonAsync("/api/library/rubrics", Rubric(code, formula));
        var problem = await response.Content.ReadFromJsonAsync<JsonNode>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(fragment, (string)problem!["detail"]!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Saves_and_deletes_tables_and_validates_brackets()
    {
        Assert.Equal(HttpStatusCode.NoContent, (await _client.PostAsJsonAsync("/api/library/tables", Table("MINHA"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/library/tables", Table("RUIM", -5m))).StatusCode);

        var tables = (await Library())["tables"]!.AsArray();
        Assert.Contains(tables, t => (string)t!["table"]!["code"]! == "MINHA" && !(bool)t["builtIn"]!);

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync(new Uri("/api/library/tables/MINHA", UriKind.Relative))).StatusCode);
    }
}
