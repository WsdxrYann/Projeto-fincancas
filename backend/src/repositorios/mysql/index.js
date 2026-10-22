// =====================================================================
// REPOSITÓRIOS MYSQL — única parte do back-end que escreve SQL.
// Tabelas definidas em db/schema.sql (Pessoa 4). Toda consulta filtra
// por usuario_id, então um usuário nunca enxerga dado de outro.
// =====================================================================
const { valorParaCentavos } = require('../../regras/validacao');

const linhaParaCategoria = r => ({
  id: r.id,
  usuarioId: r.usuario_id,
  nome: r.nome,
  cor: r.cor,
  icone: r.icone,
  tipo: r.tipo,
  favorita: Boolean(r.favorita),
  ordem: r.ordem,
});

const linhaParaTransacao = r => ({
  id: r.id,
  usuarioId: r.usuario_id,
  categoriaId: r.categoria_id,
  tipo: r.tipo,
  descricao: r.descricao,
  valorCentavos: valorParaCentavos(r.valor),
  data: r.data,
  status: r.status,
});

const centavosParaDecimal = c => (c / 100).toFixed(2);

// Monta o WHERE dos filtros. Com ano informado usa intervalo de datas,
// que aproveita o índice idx_transacoes_usuario_data.
function whereFiltros(usuarioId, filtros) {
  const condicoes = ['usuario_id = ?'];
  const params = [usuarioId];
  if (filtros.tipo) { condicoes.push('tipo = ?'); params.push(filtros.tipo); }
  if (filtros.ano && filtros.mes) {
    const inicio = `${filtros.ano}-${String(filtros.mes).padStart(2, '0')}-01`;
    condicoes.push('data >= ? AND data < DATE_ADD(?, INTERVAL 1 MONTH)');
    params.push(inicio, inicio);
  } else if (filtros.ano) {
    condicoes.push('data >= ? AND data < ?');
    params.push(`${filtros.ano}-01-01`, `${filtros.ano + 1}-01-01`);
  } else if (filtros.mes) {
    condicoes.push('MONTH(data) = ?');
    params.push(filtros.mes);
  }
  if (filtros.status) { condicoes.push('status = ?'); params.push(filtros.status); }
  if (filtros.busca) { condicoes.push('descricao LIKE ?'); params.push(`%${filtros.busca.replace(/[\\%_]/g, '\\$&')}%`); }
  return { sql: condicoes.join(' AND '), params };
}

function criarRepositoriosMysql(pool) {
  const categorias = {
    async listar(usuarioId, { tipo } = {}) {
      const [linhas] = tipo
        ? await pool.execute('SELECT * FROM categorias WHERE usuario_id = ? AND tipo = ? ORDER BY ordem, id', [usuarioId, tipo])
        : await pool.execute('SELECT * FROM categorias WHERE usuario_id = ? ORDER BY ordem, id', [usuarioId]);
      return linhas.map(linhaParaCategoria);
    },
    async buscarPorId(usuarioId, id) {
      const [linhas] = await pool.execute('SELECT * FROM categorias WHERE usuario_id = ? AND id = ?', [usuarioId, id]);
      return linhas.length ? linhaParaCategoria(linhas[0]) : null;
    },
    async buscarPorNome(usuarioId, nome, tipo) {
      // collation utf8mb4_unicode_ci já compara sem diferenciar maiúscula/minúscula
      const [linhas] = await pool.execute('SELECT * FROM categorias WHERE usuario_id = ? AND nome = ? AND tipo = ?', [usuarioId, nome, tipo]);
      return linhas.length ? linhaParaCategoria(linhas[0]) : null;
    },
    async criar(usuarioId, d) {
      const [r] = await pool.execute(
        'INSERT INTO categorias (usuario_id, nome, cor, icone, tipo, favorita, ordem) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [usuarioId, d.nome, d.cor, d.icone, d.tipo, Boolean(d.favorita), d.ordem || 0],
      );
      return categorias.buscarPorId(usuarioId, r.insertId);
    },
    async atualizar(usuarioId, id, d) {
      const colunas = { nome: 'nome', cor: 'cor', icone: 'icone', tipo: 'tipo', favorita: 'favorita', ordem: 'ordem' };
      const campos = Object.keys(d).filter(k => colunas[k]);
      if (campos.length) {
        await pool.execute(
          `UPDATE categorias SET ${campos.map(k => `${colunas[k]} = ?`).join(', ')} WHERE usuario_id = ? AND id = ?`,
          [...campos.map(k => d[k]), usuarioId, id],
        );
      }
      return categorias.buscarPorId(usuarioId, id);
    },
    async excluir(usuarioId, id) {
      const [r] = await pool.execute('DELETE FROM categorias WHERE usuario_id = ? AND id = ?', [usuarioId, id]);
      return r.affectedRows > 0;
    },
    async contarTransacoes(usuarioId, id) {
      const [linhas] = await pool.execute('SELECT COUNT(*) AS total FROM transacoes WHERE usuario_id = ? AND categoria_id = ?', [usuarioId, id]);
      return Number(linhas[0].total);
    },
  };

  const transacoes = {
    async listar(usuarioId, filtros = {}) {
      const { sql, params } = whereFiltros(usuarioId, filtros);
      const [linhas] = await pool.execute(`SELECT * FROM transacoes WHERE ${sql} ORDER BY data DESC, id DESC`, params);
      return linhas.map(linhaParaTransacao);
    },
    async buscarPorId(usuarioId, id) {
      const [linhas] = await pool.execute('SELECT * FROM transacoes WHERE usuario_id = ? AND id = ?', [usuarioId, id]);
      return linhas.length ? linhaParaTransacao(linhas[0]) : null;
    },
    async criar(usuarioId, d) {
      const [r] = await pool.execute(
        'INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [usuarioId, d.categoriaId, d.tipo, d.descricao, centavosParaDecimal(d.valorCentavos), d.data, d.status],
      );
      return transacoes.buscarPorId(usuarioId, r.insertId);
    },
    async atualizar(usuarioId, id, d) {
      const colunas = { categoriaId: 'categoria_id', tipo: 'tipo', descricao: 'descricao', valorCentavos: 'valor', data: 'data', status: 'status' };
      const campos = Object.keys(d).filter(k => colunas[k]);
      if (campos.length) {
        const valores = campos.map(k => (k === 'valorCentavos' ? centavosParaDecimal(d[k]) : d[k]));
        await pool.execute(
          `UPDATE transacoes SET ${campos.map(k => `${colunas[k]} = ?`).join(', ')} WHERE usuario_id = ? AND id = ?`,
          [...valores, usuarioId, id],
        );
      }
      return transacoes.buscarPorId(usuarioId, id);
    },
    async excluir(usuarioId, id) {
      const [r] = await pool.execute('DELETE FROM transacoes WHERE usuario_id = ? AND id = ?', [usuarioId, id]);
      return r.affectedRows > 0;
    },
  };

  return { categorias, transacoes };
}

module.exports = { criarRepositoriosMysql, whereFiltros };
