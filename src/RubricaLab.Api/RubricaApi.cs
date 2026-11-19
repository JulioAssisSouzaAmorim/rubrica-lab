using RubricaLab.Core.Engine;
using RubricaLab.Core.Model;
using RubricaLab.Core.Samples;
using RubricaLab.Core.Syntax;

namespace RubricaLab.Api;

public sealed record ValidationResponse(bool Success, IReadOnlyList<Diagnostic> Diagnostics, IReadOnlyList<string> Order);

public sealed record MarginalRequest(PayrollSheet Sheet, string Input, decimal? Step = null);

public sealed record SweepRequest(PayrollSheet Sheet, string Input, decimal From, decimal To, int Points = 50);

public static class RubricaApi
{
    public static IEndpointRouteBuilder MapRubricaApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api").WithTags("Rubrica Lab");

        api.MapGet("/health", () => TypedResults.Ok(new { Status = "ok" }));

        api.MapGet("/functions", () => TypedResults.Ok(Builtins.All.Values.OrderBy(f => f.Name, StringComparer.Ordinal)))
            .WithSummary("Funções disponíveis na linguagem de fórmulas.");

        api.MapGet("/samples/clt-2025", () => TypedResults.Ok(SampleSheets.Clt2025))
            .WithSummary("Holerite CLT de exemplo com as tabelas de INSS e IRRF de 2025.");

        api.MapPost("/validate", (PayrollSheet sheet) =>
            {
                var compilation = PayrollCompiler.Compile(sheet);
                return TypedResults.Ok(new ValidationResponse(compilation.Success, compilation.Diagnostics, compilation.Sheet?.Order ?? []));
            })
            .AddEndpointFilter(SheetLimits.Filter(args => args.GetArgument<PayrollSheet>(0)))
            .WithSummary("Compila as fórmulas sem calcular.");

        api.MapPost("/evaluate", (PayrollSheet sheet) =>
            {
                var compilation = PayrollCompiler.Compile(sheet);
                return TypedResults.Ok(compilation.Sheet?.Evaluate() ?? EvaluationResult.Failed(compilation.Diagnostics));
            })
            .AddEndpointFilter(SheetLimits.Filter(args => args.GetArgument<PayrollSheet>(0)))
            .WithSummary("Calcula o holerite com memória de cálculo.");

        api.MapPost("/sensitivity/marginal", (MarginalRequest request) =>
            {
                var compilation = PayrollCompiler.Compile(request.Sheet);
                return TypedResults.Ok(compilation.Sheet is { } sheet
                    ? Sensitivity.Marginal(sheet, request.Input, request.Step ?? 100m)
                    : new MarginalAnalysis(null, compilation.Diagnostics));
            })
            .AddEndpointFilter(SheetLimits.Filter(args => args.GetArgument<MarginalRequest>(0).Sheet))
            .WithSummary("Quanto de um acréscimo numa entrada chega ao líquido.");

        api.MapPost("/sensitivity/sweep", (SweepRequest request) =>
            {
                var compilation = PayrollCompiler.Compile(request.Sheet);
                return TypedResults.Ok(compilation.Sheet is { } sheet
                    ? Sensitivity.Sweep(sheet, request.Input, request.From, request.To, request.Points)
                    : new SweepAnalysis(null, compilation.Diagnostics));
            })
            .AddEndpointFilter(SheetLimits.Filter(args => args.GetArgument<SweepRequest>(0).Sheet))
            .WithSummary("Curva de líquido e alíquota marginal ao variar uma entrada.");

        return app;
    }
}
