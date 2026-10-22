const test = require('node:test');
const assert = require('node:assert/strict');
const { valorParaCentavos, dataValida, validarTransacao, validarCategoria, statusFinal } = require('../src/regras/validacao');
const { lerFiltros, correspondeFiltros } = require('../src/regras/periodo');
const { calcularBalanco } = require('../src/regras/balanco');
const { ErroValidacao } = require('../src/erros');

test('valorParaCentavos aceita número e texto no formato brasileiro', () => {
  assert.equal(valorParaCentavos(950), 95000);
  assert.equal(valorParaCentavos(0.1), 10);
  assert.equal(valorParaCentavos(386.4), 38640);
  assert.equal(valorParaCentavos('1.234,56'), 123456);
  assert.equal(valorParaCentavos('99,9'), 9990);
  assert.equal(valorParaCentavos('950.00'), 95000);
});

test('valorParaCentavos rejeita formatos inválidos', () => {
  for (const v of ['abc', '', '10,555', 1.005, -5, '-5', NaN, Infinity, null, undefined, {}, '1e3']) {
    assert.equal(valorParaCentavos(v), null, `deveria rejeitar ${String(v)}`);
  }
});

test('dataValida confere o calendário de verdade', () => {
  assert.ok(dataValida('2026-09-05'));
  assert.ok(dataValida('2028-02-29'));
  assert.ok(!dataValida('2026-02-29'));
  assert.ok(!dataValida('2026-13-01'));
  assert.ok(!dataValida('05/09/2026'));
});

test('validarTransacao devolve dados limpos', () => {
  const d = validarTransacao({ tipo: 'despesa', descricao: '  Aluguel ', valor: '950,00', data: '2026-09-05', categoriaId: '3' });
  assert.deepEqual(d, { tipo: 'despesa', descricao: 'Aluguel', valorCentavos: 95000, data: '2026-09-05', categoriaId: 3 });
});

test('validarTransacao junta todos os erros por campo', () => {
  try {
    validarTransacao({ tipo: 'outro', descricao: ' ', valor: 0, data: 'ontem' });
    assert.fail('deveria lançar');
  } catch (e) {
    assert.ok(e instanceof ErroValidacao);
    assert.deepEqual(Object.keys(e.campos).sort(), ['categoriaId', 'data', 'descricao', 'tipo', 'valor']);
    assert.equal(e.campos.valor, 'O valor precisa ser maior que zero');
  }
});

test('validarTransacao barra valor acima do limite do DECIMAL(10,2)', () => {
  assert.throws(() => validarTransacao({ valor: 100000000 }, { parcial: true }), /máximo/);
  assert.doesNotThrow(() => validarTransacao({ valor: '99999999.99' }, { parcial: true }));
});

test('validarTransacao parcial só olha os campos enviados', () => {
  assert.deepEqual(validarTransacao({ valor: 10 }, { parcial: true }), { valorCentavos: 1000 });
});

test('receita é sempre paga; despesa começa a pagar', () => {
  assert.equal(statusFinal('receita', 'pagar'), 'paga');
  assert.equal(statusFinal('despesa'), 'pagar');
  assert.equal(statusFinal('despesa', 'paga'), 'paga');
});

test('validarCategoria aplica padrões e barra cor inválida', () => {
  assert.deepEqual(validarCategoria({ nome: 'Pets', tipo: 'despesa' }), { nome: 'Pets', tipo: 'despesa', cor: '#F2600C', icone: '🏷️' });
  assert.throws(() => validarCategoria({ nome: 'Pets', tipo: 'despesa', cor: 'azul' }), /RRGGBB/);
});

test('lerFiltros trata "todos" como sem filtro e valida mês', () => {
  assert.deepEqual(lerFiltros({ mes: 'todos', ano: 'todos', status: 'todas' }), {});
  assert.deepEqual(lerFiltros({ mes: '9', ano: '2026', tipo: 'despesa' }), { mes: 9, ano: 2026, tipo: 'despesa' });
  assert.throws(() => lerFiltros({ mes: '13' }), /1 a 12/);
});

test('correspondeFiltros: mês sem ano pega o mês de todos os anos', () => {
  const t = { tipo: 'despesa', data: '2025-09-10', status: 'paga', descricao: 'Mercado' };
  assert.ok(correspondeFiltros(t, { mes: 9 }));
  assert.ok(!correspondeFiltros(t, { mes: 9, ano: 2026 }));
  assert.ok(correspondeFiltros(t, { busca: 'merc' }));
});

test('calcularBalanco separa saldo realizado e previsto, sem erro de centavos', () => {
  const lista = [
    { tipo: 'receita', valorCentavos: 10, status: 'paga', categoriaId: 9 },
    { tipo: 'receita', valorCentavos: 20, status: 'paga', categoriaId: 9 },
    { tipo: 'despesa', valorCentavos: 15, status: 'paga', categoriaId: 1 },
    { tipo: 'despesa', valorCentavos: 5, status: 'pagar', categoriaId: 2 },
  ];
  const b = calcularBalanco(lista, [{ id: 1, nome: 'Moradia', cor: '#000000' }]);
  assert.equal(b.totalReceitas, 0.3);
  assert.equal(b.totalDespesas, 0.2);
  assert.equal(b.despesasPagas, 0.15);
  assert.equal(b.despesasPendentes, 0.05);
  assert.equal(b.quantidadePendentes, 1);
  assert.equal(b.saldoRealizado, 0.15);
  assert.equal(b.saldoPrevisto, 0.1);
  assert.deepEqual(b.gastosPorCategoria.map(g => [g.nome, g.total, g.percentual]), [['Moradia', 0.15, 75], [null, 0.05, 25]]);
});

test('calcularBalanco de período vazio zera tudo', () => {
  const b = calcularBalanco([]);
  assert.equal(b.saldoPrevisto, 0);
  assert.deepEqual(b.gastosPorCategoria, []);
});
