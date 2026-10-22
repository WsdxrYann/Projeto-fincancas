// =====================================================================
// REPOSITÓRIO EM MEMÓRIA — mesma interface do repositório MySQL.
// Usado nos testes automatizados e pra rodar a API sem banco instalado
// (npm run dev:memoria). Os dados somem quando o servidor reinicia.
// =====================================================================
const { correspondeFiltros } = require('../regras/periodo');

function criarRepositoriosMemoria() {
  const categorias = [];
  const transacoes = [];
  let proximoIdCategoria = 1;
  let proximoIdTransacao = 1;
  const copia = obj => (obj ? { ...obj } : null);

  const repoCategorias = {
    async listar(usuarioId, { tipo } = {}) {
      return categorias
        .filter(c => c.usuarioId === usuarioId && (!tipo || c.tipo === tipo))
        .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
        .map(copia);
    },
    async buscarPorId(usuarioId, id) {
      return copia(categorias.find(c => c.usuarioId === usuarioId && c.id === id));
    },
    async buscarPorNome(usuarioId, nome, tipo) {
      const alvo = nome.toLowerCase();
      return copia(categorias.find(c => c.usuarioId === usuarioId && c.tipo === tipo && c.nome.toLowerCase() === alvo));
    },
    async criar(usuarioId, dados) {
      const nova = { favorita: false, ordem: 0, ...dados, id: proximoIdCategoria++, usuarioId };
      categorias.push(nova);
      return copia(nova);
    },
    async atualizar(usuarioId, id, dados) {
      const c = categorias.find(x => x.usuarioId === usuarioId && x.id === id);
      if (!c) return null;
      Object.assign(c, dados);
      return copia(c);
    },
    async excluir(usuarioId, id) {
      const i = categorias.findIndex(c => c.usuarioId === usuarioId && c.id === id);
      if (i === -1) return false;
      categorias.splice(i, 1);
      return true;
    },
    async contarTransacoes(usuarioId, id) {
      return transacoes.filter(t => t.usuarioId === usuarioId && t.categoriaId === id).length;
    },
  };

  const repoTransacoes = {
    async listar(usuarioId, filtros = {}) {
      return transacoes
        .filter(t => t.usuarioId === usuarioId && correspondeFiltros(t, filtros))
        .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
        .map(copia);
    },
    async buscarPorId(usuarioId, id) {
      return copia(transacoes.find(t => t.usuarioId === usuarioId && t.id === id));
    },
    async criar(usuarioId, dados) {
      const nova = { ...dados, id: proximoIdTransacao++, usuarioId };
      transacoes.push(nova);
      return copia(nova);
    },
    async atualizar(usuarioId, id, dados) {
      const t = transacoes.find(x => x.usuarioId === usuarioId && x.id === id);
      if (!t) return null;
      Object.assign(t, dados);
      return copia(t);
    },
    async excluir(usuarioId, id) {
      const i = transacoes.findIndex(t => t.usuarioId === usuarioId && t.id === id);
      if (i === -1) return false;
      transacoes.splice(i, 1);
      return true;
    },
  };

  return { categorias: repoCategorias, transacoes: repoTransacoes };
}

module.exports = { criarRepositoriosMemoria };
