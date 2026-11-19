using RubricaLab.Core.Model;

namespace RubricaLab.Api;

public static class LibraryApi
{
    public static IEndpointRouteBuilder MapLibraryApi(this IEndpointRouteBuilder app)
    {
        var library = app.MapGroup("/api/library").WithTags("Biblioteca");

        library.MapGet("/", (LibraryStore store) => TypedResults.Ok(store.List()))
            .WithSummary("Rubricas e tabelas salvas, incluindo as padrão.");

        library.MapPost("/rubrics", (Rubric rubric, LibraryStore store) => ToHttp(store.SaveRubric(rubric)))
            .WithSummary("Salva (ou atualiza) uma rubrica pelo código.");

        library.MapDelete("/rubrics/{code}", (string code, LibraryStore store) => ToHttp(store.DeleteRubric(code)))
            .WithSummary("Exclui uma rubrica salva. Padrões não podem ser excluídas.");

        library.MapPost("/tables", (TaxTable table, LibraryStore store) => ToHttp(store.SaveTable(table)))
            .WithSummary("Salva (ou atualiza) uma tabela pelo código.");

        library.MapDelete("/tables/{code}", (string code, LibraryStore store) => ToHttp(store.DeleteTable(code)))
            .WithSummary("Exclui uma tabela salva. Padrões não podem ser excluídas.");

        return app;
    }

    private static IResult ToHttp(StoreResult result) => result.Outcome switch
    {
        StoreOutcome.Ok => TypedResults.NoContent(),
        StoreOutcome.NotFound => TypedResults.Problem(result.Error, statusCode: StatusCodes.Status404NotFound),
        StoreOutcome.BuiltIn => TypedResults.Problem(result.Error, statusCode: StatusCodes.Status409Conflict),
        _ => TypedResults.Problem(result.Error, statusCode: StatusCodes.Status400BadRequest),
    };
}
