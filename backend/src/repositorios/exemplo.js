// Dados de exemplo iguais ao db/seed.sql, pra rodar em memória.
const CATEGORIAS = [
  ['Moradia', '#F2600C', '🏠', 'despesa'],
  ['Alimentação', '#2F7DBF', '🛒', 'despesa'],
  ['Transporte', '#8A5CD6', '⛽', 'despesa'],
  ['Lazer', '#D6497D', '🎬', 'despesa'],
  ['Saúde', '#3EA37A', '💊', 'despesa'],
  ['Educação', '#C9A227', '📚', 'despesa'],
  ['Outros', '#6B6B66', '📦', 'despesa'],
  ['Renda Fixa', '#1E8A5F', '💼', 'receita'],
  ['Renda Extra', '#3FA36B', '💻', 'receita'],
  ['Investimentos', '#2F9E82', '📈', 'receita'],
];

const TRANSACOES = [
  ['despesa', 'Aluguel', 95000, '2026-09-05', 'Moradia', 'pagar'],
  ['despesa', 'Mercado', 38640, '2026-08-28', 'Alimentação', 'paga'],
  ['despesa', 'Combustível', 21000, '2026-09-18', 'Transporte', 'pagar'],
  ['despesa', 'Internet', 9990, '2026-08-10', 'Moradia', 'paga'],
  ['despesa', 'Assinatura streaming', 3990, '2026-09-22', 'Lazer', 'pagar'],
  ['despesa', 'Farmácia', 6820, '2026-08-14', 'Saúde', 'paga'],
  ['receita', 'Salário', 420000, '2026-08-01', 'Renda Fixa', 'paga'],
  ['receita', 'Freelance de design', 150000, '2026-08-14', 'Renda Extra', 'paga'],
  ['receita', 'Dividendos', 42000, '2026-08-20', 'Investimentos', 'paga'],
];

async function popularExemplo(repos, usuarioId) {
  const ids = {};
  for (const [i, [nome, cor, icone, tipo]] of CATEGORIAS.entries()) {
    const c = await repos.categorias.criar(usuarioId, { nome, cor, icone, tipo, favorita: false, ordem: i + 1 });
    ids[nome] = c.id;
  }
  for (const [tipo, descricao, valorCentavos, data, categoria, status] of TRANSACOES) {
    await repos.transacoes.criar(usuarioId, { tipo, descricao, valorCentavos, data, categoriaId: ids[categoria], status });
  }
}

module.exports = { popularExemplo };
