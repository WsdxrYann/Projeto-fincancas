// =====================================================================
// API REST do Poupee. Recebe os repositórios por parâmetro: em produção
// são os do MySQL, nos testes são os em memória.
// =====================================================================
const express = require('express');
const { ErroApp, ErroValidacao } = require('./erros');
const { criarServicoCategorias } = require('./servicos/categorias');
const { criarServicoTransacoes } = require('./servicos/transacoes');
const { criarServicoBalanco } = require('./servicos/balanco');

// Enquanto o login não existe, o front informa o usuário no cabeçalho
// X-Usuario-Id. Quando a autenticação entrar, só esta função muda.
function identificarUsuario(req, res, next) {
  const id = Number(req.get('X-Usuario-Id'));
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(401).json({ erro: 'Usuário não identificado (cabeçalho X-Usuario-Id)' });
  }
  req.usuarioId = id;
  next();
}

function idDaRota(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErroValidacao({ id: 'Id inválido' });
  return id;
}

// Repassa erro de função async pro tratador de erros do Express
const rota = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Erros que o MySQL pode devolver mesmo com a validação do back-end
// (ex.: duas requisições ao mesmo tempo criando a mesma categoria)
function traduzirErroBanco(err) {
  if (err.code === 'ER_DUP_ENTRY') return { status: 409, erro: 'Esse registro já existe' };
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return { status: 409, erro: 'Registro em uso por outros lançamentos' };
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return { status: 400, erro: 'Categoria ou usuário inexistente' };
  if (['ER_CHECK_CONSTRAINT_VIOLATED', 'ER_CONSTRAINT_FAILED', 'ER_SIGNAL_EXCEPTION'].includes(err.code)) return { status: 400, erro: err.sqlMessage };
  return null;
}

function criarApp(repos, { origemPermitida = '*' } = {}) {
  const categorias = criarServicoCategorias(repos);
  const transacoes = criarServicoTransacoes(repos);
  const balanco = criarServicoBalanco(repos);

  const app = express();
  app.use(express.json());

  // CORS: o front roda separado (Live Server / GitHub Pages)
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', origemPermitida);
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Usuario-Id');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/saude', (req, res) => res.json({ ok: true }));

  const api = express.Router();
  api.use(identificarUsuario);

  // ---------- Categorias ----------
  api.get('/categorias', rota(async (req, res) => {
    res.json(await categorias.listar(req.usuarioId, { tipo: req.query.tipo }));
  }));
  api.get('/categorias/:id', rota(async (req, res) => {
    res.json(await categorias.obter(req.usuarioId, idDaRota(req)));
  }));
  api.post('/categorias', rota(async (req, res) => {
    res.status(201).json(await categorias.criar(req.usuarioId, req.body));
  }));
  api.put('/categorias/:id', rota(async (req, res) => {
    res.json(await categorias.atualizar(req.usuarioId, idDaRota(req), req.body));
  }));
  api.delete('/categorias/:id', rota(async (req, res) => {
    await categorias.excluir(req.usuarioId, idDaRota(req));
    res.sendStatus(204);
  }));

  // ---------- Lançamentos (despesas e receitas) ----------
  // GET /api/transacoes?tipo=despesa&mes=9&ano=2026&status=pagar&busca=mercado
  api.get('/transacoes', rota(async (req, res) => {
    res.json(await transacoes.listar(req.usuarioId, req.query));
  }));
  api.get('/transacoes/:id', rota(async (req, res) => {
    res.json(await transacoes.obter(req.usuarioId, idDaRota(req)));
  }));
  api.post('/transacoes', rota(async (req, res) => {
    res.status(201).json(await transacoes.criar(req.usuarioId, req.body));
  }));
  api.put('/transacoes/:id', rota(async (req, res) => {
    res.json(await transacoes.atualizar(req.usuarioId, idDaRota(req), req.body));
  }));
  api.patch('/transacoes/:id/status', rota(async (req, res) => {
    res.json(await transacoes.alterarStatus(req.usuarioId, idDaRota(req), (req.body || {}).status));
  }));
  api.delete('/transacoes/:id', rota(async (req, res) => {
    await transacoes.excluir(req.usuarioId, idDaRota(req));
    res.sendStatus(204);
  }));

  // ---------- Balanço ----------
  // GET /api/balanco?mes=9&ano=2026
  api.get('/balanco', rota(async (req, res) => {
    res.json(await balanco.calcular(req.usuarioId, req.query));
  }));

  app.use('/api', api);

  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ErroApp) {
      return res.status(err.status).json({ erro: err.message, ...(err.campos ? { campos: err.campos } : {}) });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
    const doBanco = traduzirErroBanco(err);
    if (doBanco) return res.status(doBanco.status).json({ erro: doBanco.erro });
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no servidor' });
  });

  return app;
}

module.exports = { criarApp };
