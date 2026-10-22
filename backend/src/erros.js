// Erros de regra de negócio. Cada um carrega o status HTTP que a API devolve,
// assim o front recebe uma mensagem pronta pra mostrar no toast.

class ErroApp extends Error {
  constructor(mensagem, status, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos; // { campo: 'mensagem' } — só nos erros de validação
  }
}

class ErroValidacao extends ErroApp {
  constructor(campos) {
    const primeira = Object.values(campos)[0];
    super(primeira, 400, campos);
  }
}

class ErroNaoEncontrado extends ErroApp {
  constructor(mensagem) { super(mensagem, 404); }
}

class ErroConflito extends ErroApp {
  constructor(mensagem) { super(mensagem, 409); }
}

module.exports = { ErroApp, ErroValidacao, ErroNaoEncontrado, ErroConflito };
