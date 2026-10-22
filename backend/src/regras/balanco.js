// =====================================================================
// BALANÇO FINANCEIRO — calculado sobre os lançamentos de um período,
// pela data de competência (vencimento da despesa / recebimento da receita).
//
//   saldoRealizado = receitas − despesas já pagas   (o que sobrou de fato)
//   saldoPrevisto  = receitas − todas as despesas   (o que vai sobrar quando
//                                                    pagar as pendentes)
//
// Todas as contas em centavos (inteiros) pra não perder precisão.
// =====================================================================
const { centavosParaValor } = require('./validacao');

function calcularBalanco(transacoes, categorias = []) {
  let receitas = 0;
  let despesas = 0;
  let pagas = 0;
  let pendentes = 0;
  let qtdPendentes = 0;
  const porCategoria = new Map();

  for (const t of transacoes) {
    if (t.tipo === 'receita') {
      receitas += t.valorCentavos;
      continue;
    }
    despesas += t.valorCentavos;
    if (t.status === 'paga') pagas += t.valorCentavos;
    else { pendentes += t.valorCentavos; qtdPendentes++; }
    porCategoria.set(t.categoriaId, (porCategoria.get(t.categoriaId) || 0) + t.valorCentavos);
  }

  const nomes = new Map(categorias.map(c => [c.id, c]));
  const gastosPorCategoria = [...porCategoria.entries()]
    .map(([categoriaId, total]) => {
      const c = nomes.get(categoriaId);
      return {
        categoriaId,
        nome: c ? c.nome : null,
        cor: c ? c.cor : null,
        total: centavosParaValor(total),
        percentual: despesas ? Math.round((total / despesas) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    totalReceitas: centavosParaValor(receitas),
    totalDespesas: centavosParaValor(despesas),
    despesasPagas: centavosParaValor(pagas),
    despesasPendentes: centavosParaValor(pendentes),
    quantidadePendentes: qtdPendentes,
    saldoRealizado: centavosParaValor(receitas - pagas),
    saldoPrevisto: centavosParaValor(receitas - despesas),
    gastosPorCategoria,
  };
}

module.exports = { calcularBalanco };
