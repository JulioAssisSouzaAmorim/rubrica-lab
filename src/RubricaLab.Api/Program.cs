using System.Text.Json.Serialization;
using RubricaLab.Api;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 256 * 1024);
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.SerializerOptions.RespectNullableAnnotations = true;
    options.SerializerOptions.RespectRequiredConstructorParameters = true;
});
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = false);
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddSingleton(services => new LibraryStore(
    services.GetRequiredService<IConfiguration>()["Library:Path"]
    ?? Path.Combine(services.GetRequiredService<IHostEnvironment>().ContentRootPath, "App_Data", "library.json")));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapRubricaApi();
app.MapLibraryApi();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
