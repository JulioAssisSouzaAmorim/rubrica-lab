# Tutorial do Rubrica Lab

Um guia rápido para quem nunca abriu a aplicação. Não precisa saber programar.

## O que é

O Rubrica Lab é uma **folha de pagamento em que cada linha do holerite é uma fórmula**, como numa planilha.
Você digita as regras, por exemplo "periculosidade é 30% do salário", e a aplicação:

- calcula o holerite inteiro na hora;
- mostra **de onde veio cada número**, passo a passo (a "memória de cálculo");
- avisa quando uma fórmula está errada e aponta exatamente onde;
- desenha gráficos de como o salário líquido muda quando o bruto muda.

Ela já abre com um holerite CLT de exemplo, usando as tabelas de INSS e IRRF de 2025.

> É um projeto experimental para estudo. Os valores servem de exemplo e não substituem a orientação de um
> contador.

## Abrindo a aplicação

Com o .NET 10 e o Node instalados, rode na pasta do projeto:

```bash
npm install
npm start
```

Depois abra **http://localhost:5180** no navegador.

## A tela, em quatro passos

### 1. Monte a folha

**Entradas** são os dados do colaborador: salário base, número de dependentes, horas extras… Mude um valor e
tudo é recalculado. Para criar uma entrada nova, digite o nome (por exemplo `BONUS`) e clique em **+ Entrada**.

**Rubricas** são as linhas do holerite. Cada cartão tem:

| Campo     | Para que serve                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------- |
| Código    | O nome usado nas fórmulas, como `INSS`. Só letras, números e `_`.                                        |
| Tipo      | **Provento** soma no bruto, **Desconto** sai do líquido, **Base** e **Informativa** só ajudam no cálculo |
| Descrição | O texto que aparece no holerite.                                                                         |
| Fórmula   | A regra de cálculo.                                                                                      |

A ordem dos cartões não importa: a aplicação descobre sozinha quem depende de quem.

**Tabelas** guardam faixas de alíquota, como as do INSS e do IRRF. Cada faixa tem um limite ("Até"), uma
alíquota em % e uma dedução. Deixe "Até" vazio na última faixa para ela não ter limite.

### 2. Confira o holerite

Do lado direito aparecem os proventos, os descontos e o **líquido**. Clique em qualquer linha para ver, logo
abaixo, a memória de cálculo daquele valor. Nomes em azul dentro dela levam à memória da rubrica citada.

Se uma fórmula ficar errada, o holerite fica esmaecido mostrando o último cálculo válido, e o cartão com
problema mostra o erro grifado em amarelo.

### 3. Biblioteca

Gostou de uma rubrica ou tabela? Clique em **Salvar na biblioteca** no cartão. Na seção Biblioteca você pode:

- **Usar**: traz o item de volta para a folha (se já existir um com o mesmo código, ele é substituído);
- **Excluir**: apaga um item que você salvou.

Os itens marcados como **Padrão** vêm com o exemplo: dá para usar, mas não para excluir nem sobrescrever. Para
criar uma variação, troque o código antes de salvar (por exemplo `INSS_2026`).

A biblioteca fica gravada no servidor, então continua lá quando você reabre a aplicação.

### 4. Explore cenários

Escolha uma entrada (por exemplo `SALARIO_BASE`) e um intervalo. O gráfico da esquerda mostra bruto e líquido;
o da direita mostra quanto do líquido sobe a cada R$ 1 a mais. As "quinas" nas curvas são as mudanças de faixa
do INSS e do IRRF. Passe o mouse sobre o gráfico para ver os valores, ou abra **Ver como tabela**.

## Escrevendo fórmulas

| Você escreve                               | Significa                                                        |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `SALARIO_BASE * 30%`                       | 30% do salário base                                              |
| `SALARIO + PERICULOSIDADE`                 | soma de duas rubricas                                            |
| `se(TEM_PERICULOSIDADE, SALARIO * 30%, 0)` | se a condição for verdadeira, o primeiro valor; senão, o segundo |
| `max(A, B)` / `min(A, B)`                  | o maior / o menor valor                                          |
| `limite(X, 0, 1000)`                       | X, mas nunca abaixo de 0 nem acima de 1000                       |
| `arred(X, 2)`                              | arredonda para 2 casas                                           |
| `progressiva(BASE, INSS_2025)`             | cada faixa da tabela tributa só a sua parte (como o INSS)        |
| `faixa(BASE, IRRF_2025)`                   | aplica a alíquota da faixa e subtrai a dedução (como o IRRF)     |

Comparações (`>`, `>=`, `<`, `<=`, `==`, `!=`) valem 1 quando verdadeiras e 0 quando falsas. Use `&&` para "e",
`||` para "ou" e `!` para "não". Use ponto como separador decimal: `189.59`.

## Exemplo: criando um bônus

1. Em **Entradas**, crie `META_ATINGIDA` e coloque `1`.
2. Clique em **+ Rubrica**, troque o código para `BONUS` e o tipo para **Provento**.
3. Na fórmula, escreva `se(META_ATINGIDA, SALARIO_BASE * 10%, 0)`.
4. Veja o líquido subir e clique em "BONUS" no holerite para conferir a memória de cálculo.
5. Quer que o bônus pague INSS? Edite a fórmula de `BASE_INSS` para `SALARIO + PERICULOSIDADE + HORA_EXTRA + BONUS`.
6. Clique em **Salvar na biblioteca** para guardar o bônus.

## Mensagens de erro comuns

| Mensagem                              | O que fazer                                                              |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Nome desconhecido 'X'                 | Confira a grafia; a mensagem costuma sugerir o nome certo.               |
| Dependência circular: A → B → A       | Uma rubrica depende dela mesma por algum caminho. Quebre o ciclo.        |
| Esperado ')'                          | Faltou fechar um parêntese.                                              |
| 'X' é uma tabela                      | Tabelas só podem ser usadas dentro de `progressiva()` ou `faixa()`.      |
| Não foi possível falar com o servidor | A API não está rodando. Rode `npm start` e clique em **Tentar de novo**. |
