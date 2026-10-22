// Balanço do período escolhido (mês/ano) — alimenta a Visão Geral.
const { lerFiltros } = require('../regras/periodo');
const { calcularBalanco } = require('../regras/balanco');

function criarServicoBalanco(repos) {
  return {
    async calcular(usuarioId, query) {
      // tipo/status/busca não fazem sentido no balanço: só o período conta
      const { mes, ano } = lerFiltros({ mes: query.mes, ano: query.ano });
      const [transacoes, categorias] = await Promise.all([
        repos.transacoes.listar(usuarioId, { mes, ano }),
        repos.categorias.listar(usuarioId, { tipo: 'despesa' }),
      ]);
      return { periodo: { mes: mes || null, ano: ano || null }, ...calcularBalanco(transacoes, categorias) };
    },
  };
}

module.exports = { criarServicoBalanco };
