// =====================================================================
// USUÁRIOS — criar conta (UC001) e entrar (UC002).
//   - e-mail único (RN007), guardado em minúsculas
//   - senha guardada só como hash bcrypt (RNF005)
//   - ao criar a conta, o usuário já ganha as categorias padrão
//   - o login devolve um token (JWT) que o front manda em
//     "Authorization: Bearer <token>" nas demais requisições
// =====================================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ErroValidacao, ErroConflito, ErroApp } = require('../erros');
const { criarCategoriasPadrao } = require('../regras/categoriasPadrao');

const SENHA_MINIMA = 6;
const VALIDADE_TOKEN = '7d';
const TEMAS = ['light', 'dark'];

// Dados públicos do usuário (nunca devolve o hash da senha)
const paraApi = u => ({ id: u.id, nome: u.nome, email: u.email, tema: u.tema });

function validarCadastro(corpo = {}) {
  const erros = {};
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const senha = typeof corpo.senha === 'string' ? corpo.senha : '';

  if (!nome) erros.nome = 'Informe seu nome';
  else if (nome.length > 120) erros.nome = 'Texto muito longo (máximo de 120 caracteres)';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) erros.email = 'Informe um e-mail válido';

  if (senha.length < SENHA_MINIMA) erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres`;
  else if (corpo.confirmacaoSenha !== undefined && corpo.confirmacaoSenha !== senha) erros.confirmacaoSenha = 'As senhas não conferem';

  if (Object.keys(erros).length) throw new ErroValidacao(erros);
  return { nome, email, senha };
}

function criarServicoUsuarios(repos, { segredoJwt }) {
  const repo = repos.usuarios;
  const gerarToken = u => jwt.sign({ sub: String(u.id) }, segredoJwt, { expiresIn: VALIDADE_TOKEN });

  return {
    async cadastrar(corpo) {
      const { nome, email, senha } = validarCadastro(corpo);
      if (await repo.buscarPorEmail(email)) throw new ErroConflito('Já existe uma conta com esse e-mail');
      const senhaHash = await bcrypt.hash(senha, 10);
      const usuario = await repo.criar({ nome, email, senhaHash });
      await criarCategoriasPadrao(repos.categorias, usuario.id);
      return { token: gerarToken(usuario), usuario: paraApi(usuario) };
    },

    async entrar(corpo = {}) {
      const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
      const senha = typeof corpo.senha === 'string' ? corpo.senha : '';
      const usuario = email && await repo.buscarPorEmail(email);
      // Mesma mensagem pros dois casos: não revela se o e-mail existe
      if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
        throw new ErroApp('E-mail ou senha incorretos', 401);
      }
      return { token: gerarToken(usuario), usuario: paraApi(usuario) };
    },

    // Devolve o id do usuário dono do token, ou null se o token não vale
    async usuarioDoToken(token) {
      try {
        const { sub } = jwt.verify(token, segredoJwt);
        const usuario = await repo.buscarPorId(Number(sub));
        return usuario ? usuario.id : null;
      } catch {
        return null;
      }
    },

    async obter(id) {
      return paraApi(await repo.buscarPorId(id));
    },

    // Preferências da conta: nome e tema (RNF007)
    async atualizar(id, corpo = {}) {
      const erros = {};
      const dados = {};
      if (corpo.nome !== undefined) {
        if (typeof corpo.nome !== 'string' || !corpo.nome.trim()) erros.nome = 'Informe seu nome';
        else if (corpo.nome.trim().length > 120) erros.nome = 'Texto muito longo (máximo de 120 caracteres)';
        else dados.nome = corpo.nome.trim();
      }
      if (corpo.tema !== undefined) {
        if (!TEMAS.includes(corpo.tema)) erros.tema = 'O tema precisa ser "light" ou "dark"';
        else dados.tema = corpo.tema;
      }
      if (Object.keys(erros).length) throw new ErroValidacao(erros);
      return paraApi(await repo.atualizar(id, dados));
    },
  };
}

module.exports = { criarServicoUsuarios };
