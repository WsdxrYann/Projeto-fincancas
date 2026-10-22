// =====================================================================
// CATEGORIAS — regras:
//   - nome único por usuário dentro do mesmo tipo (sem diferenciar maiúsculas)
//   - não exclui categoria que tem lançamento (o banco também barra: RESTRICT)
//   - não troca o tipo de uma categoria em uso (deixaria despesas numa
//     categoria de receita)
// =====================================================================
const { validarCategoria } = require('../regras/validacao');
const { ErroNaoEncontrado, ErroConflito } = require('../erros');

function criarServicoCategorias(repos) {
  const repo = repos.categorias;

  async function obter(usuarioId, id) {
    const c = await repo.buscarPorId(usuarioId, id);
    if (!c) throw new ErroNaoEncontrado('Categoria não encontrada');
    return c;
  }

  async function garantirNomeLivre(usuarioId, nome, tipo, idAtual) {
    const existente = await repo.buscarPorNome(usuarioId, nome, tipo);
    if (existente && existente.id !== idAtual) {
      throw new ErroConflito(`Já existe uma categoria de ${tipo} chamada "${existente.nome}"`);
    }
  }

  return {
    listar: (usuarioId, { tipo } = {}) => repo.listar(usuarioId, { tipo }),

    obter,

    async criar(usuarioId, corpo) {
      const dados = validarCategoria(corpo);
      await garantirNomeLivre(usuarioId, dados.nome, dados.tipo);
      return repo.criar(usuarioId, dados);
    },

    async atualizar(usuarioId, id, corpo) {
      const atual = await obter(usuarioId, id);
      const dados = validarCategoria(corpo, { parcial: true });
      const tipo = dados.tipo || atual.tipo;

      if (dados.tipo && dados.tipo !== atual.tipo && await repo.contarTransacoes(usuarioId, id) > 0) {
        throw new ErroConflito('Não dá pra mudar o tipo de uma categoria que já tem lançamentos');
      }
      if (dados.nome || dados.tipo) await garantirNomeLivre(usuarioId, dados.nome || atual.nome, tipo, id);

      return repo.atualizar(usuarioId, id, dados);
    },

    async excluir(usuarioId, id) {
      await obter(usuarioId, id);
      const emUso = await repo.contarTransacoes(usuarioId, id);
      if (emUso > 0) {
        throw new ErroConflito(`Essa categoria tem ${emUso} lançamento(s). Mova ou exclua os lançamentos antes.`);
      }
      await repo.excluir(usuarioId, id);
    },
  };
}

module.exports = { criarServicoCategorias };
