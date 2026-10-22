// =====================================================================
// LANÇAMENTOS (despesas e receitas) — CRUD + regras:
//   - valor > 0, data válida, descrição obrigatória (ver regras/validacao.js)
//   - a categoria precisa existir, ser do usuário e do mesmo tipo do lançamento
//   - receita é sempre "paga" (recebida); despesa começa "pagar" se não informar
// =====================================================================
const { validarTransacao, statusFinal, centavosParaValor } = require('../regras/validacao');
const { lerFiltros } = require('../regras/periodo');
const { ErroNaoEncontrado, ErroValidacao } = require('../erros');

// Formato que sai na API (valor em reais, com no máximo 2 casas)
function paraApi(t) {
  return {
    id: t.id,
    tipo: t.tipo,
    descricao: t.descricao,
    valor: centavosParaValor(t.valorCentavos),
    data: t.data,
    categoriaId: t.categoriaId,
    status: t.status,
  };
}

function criarServicoTransacoes(repos) {
  const repo = repos.transacoes;

  async function obterInterno(usuarioId, id) {
    const t = await repo.buscarPorId(usuarioId, id);
    if (!t) throw new ErroNaoEncontrado('Lançamento não encontrado');
    return t;
  }

  async function conferirCategoria(usuarioId, categoriaId, tipo) {
    const categoria = await repos.categorias.buscarPorId(usuarioId, categoriaId);
    if (!categoria) throw new ErroValidacao({ categoriaId: 'Categoria não encontrada' });
    if (categoria.tipo !== tipo) {
      throw new ErroValidacao({ categoriaId: `Essa categoria é de ${categoria.tipo}; escolha uma categoria de ${tipo}` });
    }
  }

  return {
    paraApi,

    async listar(usuarioId, query) {
      const filtros = lerFiltros(query);
      const lista = await repo.listar(usuarioId, filtros);
      return lista.map(paraApi);
    },

    async obter(usuarioId, id) {
      return paraApi(await obterInterno(usuarioId, id));
    },

    async criar(usuarioId, corpo) {
      const dados = validarTransacao(corpo);
      await conferirCategoria(usuarioId, dados.categoriaId, dados.tipo);
      dados.status = statusFinal(dados.tipo, dados.status);
      return paraApi(await repo.criar(usuarioId, dados));
    },

    // Edição parcial: manda só o que mudou. Mudar o tipo exige categoria compatível.
    async atualizar(usuarioId, id, corpo) {
      const atual = await obterInterno(usuarioId, id);
      const dados = validarTransacao(corpo, { parcial: true });
      const tipo = dados.tipo || atual.tipo;
      const categoriaId = dados.categoriaId || atual.categoriaId;

      if (dados.tipo || dados.categoriaId) await conferirCategoria(usuarioId, categoriaId, tipo);
      if (tipo === 'receita') dados.status = 'paga';
      else if (dados.tipo === 'despesa' && atual.tipo === 'receita' && !dados.status) dados.status = 'pagar';

      return paraApi(await repo.atualizar(usuarioId, id, dados));
    },

    async alterarStatus(usuarioId, id, status) {
      const atual = await obterInterno(usuarioId, id);
      if (atual.tipo === 'receita') throw new ErroValidacao({ status: 'Receita não tem status de pagamento' });
      const dados = validarTransacao({ status }, { parcial: true });
      if (!dados.status) throw new ErroValidacao({ status: 'Informe o status ("pagar" ou "paga")' });
      return paraApi(await repo.atualizar(usuarioId, id, { status: dados.status }));
    },

    async excluir(usuarioId, id) {
      await obterInterno(usuarioId, id);
      await repo.excluir(usuarioId, id);
    },
  };
}

module.exports = { criarServicoTransacoes };
