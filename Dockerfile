FROM node:24-alpine AS web
WORKDIR /repo
COPY package.json package-lock.json ./
COPY web/package.json web/
RUN npm ci --ignore-scripts
COPY web/ web/
RUN npm run build -w web -- --outDir /out/wwwroot

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /repo
COPY Directory.Build.props .editorconfig ./
COPY src/RubricaLab.Core/RubricaLab.Core.csproj src/RubricaLab.Core/
COPY src/RubricaLab.Api/RubricaLab.Api.csproj src/RubricaLab.Api/
RUN dotnet restore src/RubricaLab.Api
COPY src/ src/
RUN dotnet publish src/RubricaLab.Api -c Release --no-restore -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /out .
COPY --from=web /out/wwwroot ./wwwroot
RUN mkdir -p /app/App_Data && chown app /app/App_Data
VOLUME /app/App_Data
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "RubricaLab.Api.dll"]
