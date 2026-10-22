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
    await popularExemplo(repos, 1);
    console.log('Usando dados em memória (usuário 1 com dados de exemplo)');
  } else {
    const { criarPool } = require('./repositorios/mysql/conexao');
    const { criarRepositoriosMysql } = require('./repositorios/mysql');
    const pool = criarPool();
    await pool.query('SELECT 1'); // falha cedo se o banco não estiver acessível
    repos = criarRepositoriosMysql(pool);
    console.log(`Conectado ao MySQL em ${process.env.DB_HOST || 'localhost'}`);
  }

  criarApp(repos, { origemPermitida: process.env.CORS_ORIGEM || '*' })
    .listen(porta, () => console.log(`API do Poupee em http://localhost:${porta}/api`));
}

iniciar().catch(err => {
  console.error('Não foi possível iniciar a API:', err.message);
  process.exit(1);
});
