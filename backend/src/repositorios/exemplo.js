// Dados de exemplo iguais ao db/seed.sql, pra rodar em memória.
// Login: thiago@exemplo.com / 123456
const { criarCategoriasPadrao } = require('../regras/categoriasPadrao');

const USUARIO = {
  nome: 'Thiago Veronez',
  email: 'thiago@exemplo.com',
  senhaHash: '$2b$10$9H8UegKKMcPtSrydJGXE7egcX9YnpIl2vdxpCAydhHuqDWYwWFat.', // "123456"
};

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

// Cria o usuário de exemplo com categorias e lançamentos; devolve o usuário
async function popularExemplo(repos) {
  const usuario = await repos.usuarios.criar(USUARIO);
  const ids = await criarCategoriasPadrao(repos.categorias, usuario.id);
  for (const [tipo, descricao, valorCentavos, data, categoria, status] of TRANSACOES) {
    await repos.transacoes.criar(usuario.id, { tipo, descricao, valorCentavos, data, categoriaId: ids[categoria], status });
  }
  return usuario;
}

module.exports = { popularExemplo, USUARIO };
