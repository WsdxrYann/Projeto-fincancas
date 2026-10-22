# API do Poupee (back-end)

Lógica do sistema: CRUD de despesas e receitas, categorias, regras de negócio,
validação de valores, filtros por mês/ano e cálculo do balanço. Node.js + Express + MySQL.

## Como rodar

```bash
cd backend
npm install

# Sem banco (dados de exemplo em memória, somem ao reiniciar)
npm run dev:memoria

# Com MySQL: crie o banco com db/schema.sql (e db/seed.sql se quiser dados de exemplo),
# copie .env.example para .env, ajuste usuário/senha e rode:
npm start
```

A API sobe em `http://localhost:3000/api`.

### Testes

```bash
npm test                 # regras + API usando o repositório em memória
DB_TESTE=1 npm test      # também roda contra o MySQL do .env (ESVAZIA as tabelas!)
```

## Usuário

Enquanto o login não existe, toda requisição manda o cabeçalho `X-Usuario-Id: 1`.
Cada usuário só enxerga e altera os próprios dados.

## Endpoints

| Método | Caminho | O que faz |
| --- | --- | --- |
| GET | `/api/categorias?tipo=despesa` | Lista categorias (tipo opcional) |
| GET | `/api/categorias/:id` | Uma categoria |
| POST | `/api/categorias` | Cria `{ nome, tipo, cor?, icone?, favorita?, ordem? }` |
| PUT | `/api/categorias/:id` | Edita (manda só o que mudou) |
| DELETE | `/api/categorias/:id` | Exclui (409 se tiver lançamentos) |
| GET | `/api/transacoes?tipo=&mes=&ano=&status=&busca=` | Lista lançamentos, do mais novo pro mais antigo |
| GET | `/api/transacoes/:id` | Um lançamento |
| POST | `/api/transacoes` | Cria `{ tipo, descricao, valor, data, categoriaId, status? }` |
| PUT | `/api/transacoes/:id` | Edita (manda só o que mudou) |
| PATCH | `/api/transacoes/:id/status` | `{ status: "paga" }` ou `"pagar"` (só despesa) |
| DELETE | `/api/transacoes/:id` | Exclui |
| GET | `/api/balanco?mes=&ano=` | Balanço do período |

Filtros: `mes` (1–12) e `ano` são independentes. Sem eles, ou com `todos`, não filtra.
`mes=9` sem `ano` traz setembro de todos os anos, igual ao protótipo.

Exemplo de lançamento:

```json
{ "tipo": "despesa", "descricao": "Conta de luz", "valor": "187,35", "data": "2026-10-10", "categoriaId": 1 }
```

`valor` aceita número (`187.35`) ou o texto da máscara do formulário (`"1.234,56"`). Sempre volta como número.

Resposta do balanço:

```json
{
  "periodo": { "mes": 8, "ano": 2026 },
  "totalReceitas": 6120, "totalDespesas": 554.5,
  "despesasPagas": 554.5, "despesasPendentes": 0, "quantidadePendentes": 0,
  "saldoRealizado": 5565.5, "saldoPrevisto": 5565.5,
  "gastosPorCategoria": [{ "categoriaId": 2, "nome": "Alimentação", "cor": "#2F7DBF", "total": 386.4, "percentual": 69.7 }]
}
```

### Erros

Sempre `{ "erro": "mensagem pronta pra mostrar" }`. Erros de validação (400) trazem também
`campos`, com a mensagem de cada campo: `{ "erro": "...", "campos": { "valor": "O valor precisa ser maior que zero" } }`.
404 = não encontrado, 409 = conflito (nome repetido, categoria em uso), 401 = sem `X-Usuario-Id`.

## Regras de negócio

- Valor maior que zero, no máximo R$ 99.999.999,99 e com até 2 casas decimais.
- Data no formato `AAAA-MM-DD` e existente no calendário.
- Descrição obrigatória (até 160 caracteres).
- A categoria tem que existir, ser do usuário e do mesmo tipo do lançamento.
- Despesa começa como `pagar` se o status não vier. Receita é sempre `paga` (recebida).
- Nome de categoria único por usuário dentro do mesmo tipo (sem diferenciar maiúsculas).
- Não dá pra excluir nem trocar o tipo de uma categoria que já tem lançamentos.
- Balanço pela data de competência (a `data` do lançamento):
  - `saldoRealizado` = receitas − despesas pagas
  - `saldoPrevisto` = receitas − todas as despesas
- As contas são feitas em centavos (inteiros) pra não ter erro de arredondamento.

## Organização

```
src/
  app.js                 rotas da API e tratamento de erros
  server.js              sobe o servidor (MySQL ou memória)
  erros.js               tipos de erro → status HTTP
  regras/                validação, filtros e cálculo do balanço (sem banco, fáceis de testar)
  servicos/              regras que precisam consultar dados (categoria do mesmo tipo etc.)
  repositorios/mysql/    único lugar com SQL
  repositorios/memoria.js  mesma interface, sem banco
test/                    testes automatizados (node --test)
```
