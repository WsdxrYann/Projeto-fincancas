// Sobe a API. Por padrão usa o MySQL; com --memoria (npm run dev:memoria) roda sem banco
// (dados de exemplo do seed, perdidos ao reiniciar).
require('dotenv').config({ quiet: true });
const { criarApp } = require('./app');

async function iniciar() {
  const porta = Number(process.env.PORT || 3000);
  let repos;

  if (process.argv.includes('--memoria')) {
    const { criarRepositoriosMemoria } = require('./repositorios/memoria');
    const { popularExemplo } = require('./repositorios/exemplo');
    repos = criarRepositoriosMemoria();
    await popularExemplo(repos);
    console.log('Usando dados em memória. Login de exemplo: thiago@exemplo.com / 123456');
  } else {
    const { criarPool } = require('./repositorios/mysql/conexao');
    const { criarRepositoriosMysql } = require('./repositorios/mysql');
    const pool = criarPool();
    await pool.query('SELECT 1'); // falha cedo se o banco não estiver acessível
    repos = criarRepositoriosMysql(pool);
    console.log(`Conectado ao MySQL em ${process.env.DB_HOST || 'localhost'}`);
  }

  let segredoJwt = process.env.JWT_SEGREDO;
  if (!segredoJwt) {
    segredoJwt = require('crypto').randomBytes(32).toString('hex');
    console.warn('JWT_SEGREDO não definido no .env: usando um segredo temporário (todo mundo precisa entrar de novo quando o servidor reiniciar)');
  }

  criarApp(repos, { origemPermitida: process.env.CORS_ORIGEM || '*', segredoJwt })
    .listen(porta, () => console.log(`API do Poupee em http://localhost:${porta}/api`));
}

iniciar().catch(err => {
  console.error('Não foi possível iniciar a API:', err.message);
  process.exit(1);
});
