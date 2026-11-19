using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Testing;

namespace RubricaLab.Api.Tests;

public class ApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    private async Task<JsonNode> Sample() =>
        (await _client.GetFromJsonAsync<JsonNode>("/api/samples/clt-2025"))!;

    private async Task<(HttpStatusCode Status, JsonNode Body)> Post(string path, JsonNode body)
    {
        using var content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
        using var response = await _client.PostAsync(new Uri(path, UriKind.Relative), content);
        var text = await response.Content.ReadAsStringAsync();
        return (response.StatusCode, JsonNode.Parse(text)!);
    }

    [Fact]
    public async Task Health_endpoint_responds()
    {
        var body = await _client.GetFromJsonAsync<JsonNode>("/api/health");
        Assert.Equal("ok", (string?)body!["status"]);
    }

    [Fact]
    public async Task Lists_builtin_functions_sorted()
    {
        var functions = (await _client.GetFromJsonAsync<JsonArray>("/api/functions"))!;
        var names = functions.Select(f => (string)f!["name"]!).ToList();

        Assert.Contains("progressiva", names);
        Assert.Equal(names.Order(StringComparer.Ordinal), names);
    }

    [Fact]
    public async Task Sample_round_trips_through_evaluate()
    {
        var (status, body) = await Post("/api/evaluate", await Sample());

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.True((bool)body["success"]!);
        Assert.Equal(6814.89m, (decimal)body["totals"]!["net"]!);
        var inss = body["rubrics"]!.AsArray().Single(r => (string)r!["code"]! == "INSS")!;
        Assert.Equal("Deduction", (string)inss["kind"]!);
        Assert.Equal(951.63m, (decimal)inss["value"]!);
        Assert.Equal("BASE_INSS", (string)inss["dependsOn"]![0]!);
        Assert.NotEmpty(inss["trace"]!["children"]!.AsArray());
    }

    [Fact]
    public async Task Validate_returns_diagnostics_with_spans()
    {
        var sheet = await Sample();
        sheet["rubrics"]![0]!["formula"] = "SALARIO_BAS * 2";

        var (status, body) = await Post("/api/validate", sheet);

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.False((bool)body["success"]!);
        var diagnostic = body["diagnostics"]![0]!;
        Assert.Equal("RL003", (string)diagnostic["code"]!);
        Assert.Equal("SALARIO", (string)diagnostic["rubric"]!);
        Assert.Equal(0, (int)diagnostic["span"]!["start"]!);
        Assert.Equal(11, (int)diagnostic["span"]!["length"]!);
    }

    [Fact]
    public async Task Evaluate_reports_compile_errors_without_failing_the_request()
    {
        var sheet = await Sample();
        sheet["rubrics"]![0]!["formula"] = "INSS";

        var (status, body) = await Post("/api/evaluate", sheet);

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.False((bool)body["success"]!);
        Assert.Contains("circular", (string)body["diagnostics"]![0]!["message"]!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Marginal_endpoint_computes_retained_ratio()
    {
        var request = new JsonObject { ["sheet"] = await Sample(), ["input"] = "SALARIO_BASE", ["step"] = 100 };

        var (_, body) = await Post("/api/sensitivity/marginal", request);

        Assert.True((bool)body["success"]!);
        Assert.Equal(1.0067m, (decimal)body["result"]!["retainedRatio"]!);
    }

    [Fact]
    public async Task Sweep_endpoint_returns_requested_points()
    {
        var request = new JsonObject
        {
            ["sheet"] = await Sample(),
            ["input"] = "SALARIO_BASE",
            ["from"] = 1500,
            ["to"] = 10000,
            ["points"] = 18,
        };

        var (_, body) = await Post("/api/sensitivity/sweep", request);

        var points = body["points"]!.AsArray();
        Assert.Equal(18, points.Count);
        Assert.Equal(10000m, (decimal)points[^1]!["x"]!);
    }

    [Fact]
    public async Task Sensitivity_on_broken_sheet_returns_compile_diagnostics()
    {
        var sheet = await Sample();
        sheet["rubrics"]![0]!["formula"] = "(";
        var request = new JsonObject { ["sheet"] = sheet, ["input"] = "SALARIO_BASE" };

        var (_, body) = await Post("/api/sensitivity/marginal", request);

        Assert.False((bool)body["success"]!);
        Assert.Equal("RL002", (string)body["diagnostics"]![0]!["code"]!);
    }

    [Theory]
    [InlineData("""{"rubrics":[{"code":"A","description":"A","kind":"Earning","formula":null}],"tables":[],"inputs":{}}""")]
    [InlineData("""{"rubrics":[{"code":"A","description":"A","kind":"Bogus","formula":"1"}],"tables":[],"inputs":{}}""")]
    [InlineData("""{"tables":[],"inputs":{}}""")]
    [InlineData("""not json""")]
    public async Task Malformed_payloads_are_rejected_with_400(string payload)
    {
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        using var response = await _client.PostAsync(new Uri("/api/evaluate", UriKind.Relative), content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Oversized_sheets_get_validation_problem()
    {
        var rubrics = new JsonArray(Enumerable.Range(0, 201)
            .Select(i => (JsonNode)new JsonObject { ["code"] = $"R{i}", ["description"] = "x", ["kind"] = "Info", ["formula"] = "1" })
            .ToArray());
        var sheet = new JsonObject { ["rubrics"] = rubrics, ["tables"] = new JsonArray(), ["inputs"] = new JsonObject() };

        var (status, body) = await Post("/api/evaluate", sheet);

        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.NotNull(body["errors"]!["rubrics"]);
    }

    [Fact]
    public async Task Publishes_openapi_document_in_development()
    {
        var document = await _client.GetStringAsync(new Uri("/openapi/v1.json", UriKind.Relative));

        Assert.Contains("/api/sensitivity/sweep", document, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Serializes_enums_as_strings_and_camel_case()
    {
        var json = await _client.GetStringAsync(new Uri("/api/samples/clt-2025", UriKind.Relative));
        using var document = JsonDocument.Parse(json);

        Assert.Equal("Earning", document.RootElement.GetProperty("rubrics")[0].GetProperty("kind").GetString());
        Assert.True(document.RootElement.GetProperty("tables")[1].GetProperty("brackets")[4].GetProperty("upTo").ValueKind == JsonValueKind.Null);
    }
}
