using RubricaLab.Core.Model;

namespace RubricaLab.Api;

internal static class SheetLimits
{
    public const int MaxRubrics = 200;
    public const int MaxInputs = 100;
    public const int MaxTables = 20;
    public const int MaxBrackets = 20;

    public static Func<EndpointFilterInvocationContext, EndpointFilterDelegate, ValueTask<object?>> Filter(
        Func<EndpointFilterInvocationContext, PayrollSheet> select) =>
        async (context, next) =>
        {
            var errors = Check(select(context));
            return errors.Count > 0 ? TypedResults.ValidationProblem(errors) : await next(context).ConfigureAwait(false);
        };

    public static Dictionary<string, string[]> Check(PayrollSheet sheet)
    {
        var errors = new Dictionary<string, string[]>();
        if (sheet.Rubrics.Count > MaxRubrics)
        {
            errors["rubrics"] = [$"Máximo de {MaxRubrics} rubricas."];
        }
        if (sheet.Inputs.Count > MaxInputs)
        {
            errors["inputs"] = [$"Máximo de {MaxInputs} entradas."];
        }
        if (sheet.Tables.Count > MaxTables)
        {
            errors["tables"] = [$"Máximo de {MaxTables} tabelas."];
        }
        if (sheet.Tables.Any(t => t.Brackets.Count > MaxBrackets))
        {
            errors["tables.brackets"] = [$"Máximo de {MaxBrackets} faixas por tabela."];
        }
        return errors;
    }
}
