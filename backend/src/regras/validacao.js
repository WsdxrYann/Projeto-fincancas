// =====================================================================
// VALIDAÇÃO — tudo que chega do front passa por aqui antes de ir pro banco.
// O banco também tem CHECK e triggers, mas eles só servem de última
// barreira: a mensagem amigável sai daqui.
// =====================================================================
const { ErroValidacao } = require('../erros');

const TIPOS = ['despesa', 'receita'];
const STATUS_DESPESA = ['pagar', 'paga'];
const VALOR_MAXIMO_CENTAVOS = 9999999999; // DECIMAL(10,2) → 99.999.999,99
const DESCRICAO_MAX = 160;
const NOME_CATEGORIA_MAX = 60;
const ICONE_MAX = 8;
const COR_PADRAO = '#F2600C';
const ICONE_PADRAO = '🏷️';

// Converte o valor recebido pra centavos (inteiro) — assim as contas do
// balanço não sofrem com erro de ponto flutuante (0.1 + 0.2 ≠ 0.3).
// Aceita número (123.45) ou texto no formato do front ("1.234,56") ou "123.45".
function valorParaCentavos(entrada) {
  let texto;
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada)) return null;
    texto = String(entrada);
  } else if (typeof entrada === 'string') {
    texto = entrada.trim();
    if (texto.includes(',')) texto = texto.replace(/\./g, '').replace(',', '.');
  } else {
    return null;
  }
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'));
}

function centavosParaValor(centavos) {
  return Math.round(centavos) / 100;
}

// Data no formato AAAA-MM-DD e que exista no calendário (rejeita 2026-02-30)
function dataValida(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [ano, mes, dia] = str.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function textoObrigatorio(valor, max, campo, erros, rotulo) {
  if (typeof valor !== 'string' || !valor.trim()) {
    erros[campo] = `Informe ${rotulo}`;
    return null;
  }
  const limpo = valor.trim();
  if (limpo.length > max) {
    erros[campo] = `Texto muito longo (máximo de ${max} caracteres)`;
    return null;
  }
  return limpo;
}

// Valida um lançamento (despesa ou receita). Devolve os dados limpos.
// `parcial` = true no PATCH/PUT parcial: só valida os campos enviados.
function validarTransacao(entrada, { parcial = false } = {}) {
  const corpo = entrada || {};
  const erros = {};
  const dados = {};
  const enviado = campo => !parcial || corpo[campo] !== undefined;

  if (enviado('tipo')) {
    if (!TIPOS.includes(corpo.tipo)) erros.tipo = 'O tipo precisa ser "despesa" ou "receita"';
    else dados.tipo = corpo.tipo;
  }

  if (enviado('descricao')) {
    const d = textoObrigatorio(corpo.descricao, DESCRICAO_MAX, 'descricao', erros, 'a descrição');
    if (d !== null) dados.descricao = d;
  }

  if (enviado('valor')) {
    const centavos = valorParaCentavos(corpo.valor);
    if (centavos === null) erros.valor = 'Valor inválido (use até 2 casas decimais)';
    else if (centavos <= 0) erros.valor = 'O valor precisa ser maior que zero';
    else if (centavos > VALOR_MAXIMO_CENTAVOS) erros.valor = 'O valor máximo é R$ 99.999.999,99';
    else dados.valorCentavos = centavos;
  }

  if (enviado('data')) {
    if (!dataValida(corpo.data)) erros.data = 'Informe uma data válida (AAAA-MM-DD)';
    else dados.data = corpo.data;
  }

  if (enviado('categoriaId')) {
    const id = Number(corpo.categoriaId);
    if (!Number.isInteger(id) || id <= 0) erros.categoriaId = 'Escolha uma categoria';
    else dados.categoriaId = id;
  }

  if (corpo.status !== undefined) {
    if (!STATUS_DESPESA.includes(corpo.status)) erros.status = 'O status precisa ser "pagar" ou "paga"';
    else dados.status = corpo.status;
  }

  if (Object.keys(erros).length) throw new ErroValidacao(erros);
  return dados;
}

// Regra: receita não tem "a pagar" — entra sempre como recebida.
// Despesa nova sem status começa como "pagar".
function statusFinal(tipo, status) {
  if (tipo === 'receita') return 'paga';
  return status || 'pagar';
}

function validarCategoria(entrada, { parcial = false } = {}) {
  const corpo = entrada || {};
  const erros = {};
  const dados = {};
  const enviado = campo => !parcial || corpo[campo] !== undefined;

  if (enviado('nome')) {
    const n = textoObrigatorio(corpo.nome, NOME_CATEGORIA_MAX, 'nome', erros, 'o nome da categoria');
    if (n !== null) dados.nome = n;
  }

  if (enviado('tipo')) {
    if (!TIPOS.includes(corpo.tipo)) erros.tipo = 'O tipo precisa ser "despesa" ou "receita"';
    else dados.tipo = corpo.tipo;
  }

  if (corpo.cor !== undefined) {
    if (typeof corpo.cor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(corpo.cor)) erros.cor = 'A cor precisa estar no formato #RRGGBB';
    else dados.cor = corpo.cor.toUpperCase();
  } else if (!parcial) {
    dados.cor = COR_PADRAO;
  }

  if (corpo.icone !== undefined) {
    if (typeof corpo.icone !== 'string' || !corpo.icone.trim() || [...corpo.icone.trim()].length > ICONE_MAX) erros.icone = 'Ícone inválido';
    else dados.icone = corpo.icone.trim();
  } else if (!parcial) {
    dados.icone = ICONE_PADRAO;
  }

  if (corpo.favorita !== undefined) {
    if (typeof corpo.favorita !== 'boolean') erros.favorita = 'O campo favorita precisa ser verdadeiro ou falso';
    else dados.favorita = corpo.favorita;
  }

  if (corpo.ordem !== undefined) {
    if (!Number.isInteger(corpo.ordem) || corpo.ordem < 0) erros.ordem = 'A ordem precisa ser um número inteiro positivo';
    else dados.ordem = corpo.ordem;
  }

  if (Object.keys(erros).length) throw new ErroValidacao(erros);
  return dados;
}

module.exports = {
  TIPOS,
  STATUS_DESPESA,
  valorParaCentavos,
  centavosParaValor,
  dataValida,
  validarTransacao,
  validarCategoria,
  statusFinal,
};
