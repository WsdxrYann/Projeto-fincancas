// Pool de conexões com o MySQL. Configuração vem das variáveis de ambiente
// (veja backend/.env.example).
const mysql = require('mysql2/promise');

function criarPool(env = process.env) {
  return mysql.createPool({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'poupee',
    connectionLimit: 10,
    dateStrings: ['DATE'], // devolve DATE como 'AAAA-MM-DD', sem fuso horário no meio
    decimalNumbers: false, // DECIMAL chega como texto e vira centavos no repositório
    charset: 'utf8mb4',
  });
}

module.exports = { criarPool };
