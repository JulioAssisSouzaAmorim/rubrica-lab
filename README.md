# Rubrica Lab

Motor experimental de folha de pagamento em que cada rubrica é uma fórmula numa pequena linguagem própria.
O back-end em .NET compila as fórmulas, monta o grafo de dependências, calcula na ordem certa e devolve a
**memória de cálculo** de cada valor como uma árvore navegável. O front-end em React mostra o holerite, explica
cada número e trata o holerite como uma função: varia uma entrada e plota o líquido e o ganho marginal, deixando
visíveis as mudanças de faixa do INSS e do IRRF.

```
BASE_IRRF = BASE_INSS - max(INSS + DEPENDENTES * 189.59, 607.20)
IRRF      = arred(faixa(BASE_IRRF, IRRF_2025), 2)
```

> As tabelas de INSS e IRRF de 2025 servem só de exemplo. O projeto é um laboratório, não uma ferramenta fiscal.

**Primeira vez aqui?** Veja o [tutorial](docs/TUTORIAL.md), escrito para quem não programa.

## Stack

| Camada                    | Tecnologias                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Motor (`RubricaLab.Core`) | C# 14 / .NET 10, sem dependências externas                                                        |
| API (`RubricaLab.Api`)    | ASP.NET Core Minimal APIs, OpenAPI, ProblemDetails                                                |
| Web (`web/`)              | React 19, TypeScript, Vite, gráficos em SVG sem biblioteca                                        |
| Testes                    | xUnit, WebApplicationFactory, Vitest, Testing Library, Playwright, `node:test`                    |
| Qualidade                 | Analisadores .NET com warnings como erro, `dotnet format`, ESLint (strict type-checked), Prettier |
| Entrega                   | Git hooks em JavaScript, GitHub Actions, Docker multi-stage                                       |

## Como o motor funciona

1. **Lexer → parser Pratt → AST.** Cada nó guarda o trecho de origem, então erros e passos da memória de cálculo
   apontam para a posição exata na fórmula.
2. **Binder.** Resolve nomes (entradas, rubricas, tabelas), valida aridade das funções e sugere correções por
   distância de edição (`SALARO` → "Você quis dizer 'SALARIO'?").
3. **Grafo.** Ordenação topológica (Kahn) com desempate pela ordem de declaração. Ciclos são reportados com o
   caminho completo: `SALARIO → INSS → BASE_INSS → SALARIO`.
4. **Avaliação.** Aritmética em `decimal`, curto-circuito em `&&`/`||`/`se()`, erros de execução (divisão por zero,
   overflow) viram diagnósticos. Uma planilha compilada é avaliada várias vezes com entradas diferentes, que é o
   que alimenta a análise de sensibilidade.

### Linguagem

| Construção                    | Exemplo                                    |
| ----------------------------- | ------------------------------------------ |
| Aritmética e percentual       | `SALARIO_BASE * 30%`                       |
| Comparação e lógica           | `HORAS > 0 && !AFASTADO`                   |
| `se(cond, então, senão)`      | `se(TEM_PERICULOSIDADE, SALARIO * 30%, 0)` |
| `min`, `max`, `abs`, `limite` | `limite(X, 0, 1000)`                       |
| `arred(x, casas = 2)`         | arredondamento comercial                   |
| `progressiva(base, TABELA)`   | cada faixa tributa só a sua parcela (INSS) |
| `faixa(base, TABELA)`         | alíquota da faixa menos dedução (IRRF)     |

### API

| Método | Rota                          | Descrição                               |
| ------ | ----------------------------- | --------------------------------------- |
| GET    | `/api/samples/clt-2025`       | Holerite de exemplo                     |
| GET    | `/api/functions`              | Funções disponíveis                     |
| POST   | `/api/validate`               | Compila e devolve diagnósticos e ordem  |
| POST   | `/api/evaluate`               | Calcula com memória de cálculo          |
| POST   | `/api/sensitivity/marginal`   | Quanto de um acréscimo chega ao líquido |
| POST   | `/api/sensitivity/sweep`      | Curva de líquido ao variar uma entrada  |
| GET    | `/api/library`                | Rubricas e tabelas salvas e padrão      |
| POST   | `/api/library/rubrics`        | Salva ou atualiza uma rubrica           |
| DELETE | `/api/library/rubrics/{code}` | Exclui uma rubrica salva (padrão: 409)  |
| POST   | `/api/library/tables`         | Salva ou atualiza uma tabela            |
| DELETE | `/api/library/tables/{code}`  | Exclui uma tabela salva (padrão: 409)   |

Em desenvolvimento o documento OpenAPI fica em `/openapi/v1.json`. A biblioteca é gravada em
`App_Data/library.json` (configurável por `Library__Path`); os itens do exemplo são somente leitura.

## Rodando

Requisitos: .NET SDK 10 e Node 22+.

```bash
npm install                # instala dependências e ativa os git hooks
npm start                  # compila o front e serve tudo em http://localhost:5180
```

Para desenvolver com recarga automática, use dois terminais:

```bash
npm run dev:api            # API em http://localhost:5180
npm run dev:web            # front em http://localhost:5273
```

Ou tudo num contêiner:

```bash
docker build -t rubrica-lab . && docker run -p 8080:8080 rubrica-lab
```

## Testes e validações

| Nível      | Ferramenta                    | Escopo                                                                    |
| ---------- | ----------------------------- | ------------------------------------------------------------------------- |
| Unidade    | xUnit                         | lexer, parser, binder, grafo, avaliador, sensibilidade                    |
| Integração | xUnit + WebApplicationFactory | contratos HTTP, payloads inválidos, limites de tamanho                    |
| Unidade    | Vitest + Testing Library      | componentes, formatação, escalas dos gráficos, App com fetch simulado     |
| Unidade    | `node:test`                   | lógica dos próprios git hooks                                             |
| E2E        | Playwright                    | API e front reais: memória de cálculo, erros, ciclos, gráfico, biblioteca |

```bash
npm test          # scripts + web + .NET
npm run test:e2e  # sobe API e Vite e roda o Playwright
npm run verify    # tudo que o pre-push roda
```

Todo teste E2E também falha se a página registrar erro no console, perder uma requisição ou receber 4xx/5xx
inesperado da API. Para rodar a suíte contra a versão compilada já no ar:
`E2E_BASE_URL=http://localhost:5180 npm run test:e2e`.

### Git hooks

Os hooks ficam em `.githooks/` e são escritos em JavaScript (`scripts/`):

- **pre-commit**: lê o conteúdo _staged_ e bloqueia segredos, arquivos grandes, marcadores de conflito, `.only` em
  testes e `debugger`. Depois decide pelos arquivos alterados o que rodar: Prettier e ESLint só nos arquivos do
  commit, `tsc` e `vitest related` quando o front muda, `dotnet format` e `dotnet test` quando o C# muda.
- **commit-msg**: exige [Conventional Commits](https://www.conventionalcommits.org/).
- **pre-push**: roda a esteira completa, incluindo cobertura, build e E2E (`SKIP_E2E=1` pula o Playwright).

O CI no GitHub Actions repete a esteira em jobs separados para .NET, web, E2E e Docker.
