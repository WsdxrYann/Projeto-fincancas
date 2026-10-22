// Categorias criadas automaticamente quando o usuário cria a conta (UC001, passo 6).
// [nome, cor, ícone, tipo]
const CATEGORIAS_PADRAO = [
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

async function criarCategoriasPadrao(repoCategorias, usuarioId) {
  const ids = {};
  for (const [i, [nome, cor, icone, tipo]] of CATEGORIAS_PADRAO.entries()) {
    const c = await repoCategorias.criar(usuarioId, { nome, cor, icone, tipo, favorita: false, ordem: i + 1 });
    ids[nome] = c.id;
  }
  return ids;
}

module.exports = { CATEGORIAS_PADRAO, criarCategoriasPadrao };
