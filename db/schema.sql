-- =====================================================================
-- POUPEE — Banco de dados relacional (MySQL 8+)
-- Controle financeiro pessoal — TG/PI Fatec Franca
--
-- Modelo:
--   usuarios   (1) ---- (N) categorias
--   usuarios   (1) ---- (N) transacoes
--   categorias (1) ---- (N) transacoes
--
-- Regras de negócio aplicadas no schema:
--   - valor da transação sempre positivo
--   - toda transação precisa estar vinculada a uma categoria
--   - a categoria usada numa transação precisa ser do mesmo tipo (despesa/receita)
--   - balanço calculado por data de competência (coluna `data`)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS poupee
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE poupee;

-- ---------------------------------------------------------------------
-- USUÁRIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  email         VARCHAR(160)  NOT NULL,
  senha_hash    VARCHAR(255)  NOT NULL,
  tema          ENUM('light','dark') NOT NULL DEFAULT 'light',
  criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- CATEGORIAS (cada usuário tem seu próprio conjunto; nome/cor editáveis,
-- `favorita` e `ordem` sustentam o drag-and-drop e os favoritos da tela)
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  nome       VARCHAR(60)  NOT NULL,
  cor        CHAR(7)      NOT NULL DEFAULT '#F2600C',
  icone      VARCHAR(8)   NOT NULL DEFAULT '🏷️',
  tipo       ENUM('despesa','receita') NOT NULL,
  favorita   BOOLEAN      NOT NULL DEFAULT FALSE,
  ordem      INT          NOT NULL DEFAULT 0,
  criado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categorias_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT uq_categoria_por_usuario UNIQUE (usuario_id, nome, tipo),
  CONSTRAINT chk_categorias_cor CHECK (cor REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB;

CREATE INDEX idx_categorias_usuario_tipo ON categorias(usuario_id, tipo);

-- ---------------------------------------------------------------------
-- TRANSAÇÕES (despesas e receitas na mesma tabela, diferenciadas por `tipo`)
-- ---------------------------------------------------------------------
CREATE TABLE transacoes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED NOT NULL,
  categoria_id  INT UNSIGNED NOT NULL,
  tipo          ENUM('despesa','receita') NOT NULL,
  descricao     VARCHAR(160)  NOT NULL,
  valor         DECIMAL(10,2) NOT NULL,
  data          DATE          NOT NULL COMMENT 'vencimento (despesa) ou recebimento (receita) — usada como data de competência',
  status        ENUM('pagar','paga') NOT NULL DEFAULT 'paga',
  criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transacoes_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_transacoes_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON DELETE RESTRICT,
  CONSTRAINT chk_transacoes_valor_positivo CHECK (valor > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_transacoes_usuario_data   ON transacoes(usuario_id, data);
CREATE INDEX idx_transacoes_usuario_status ON transacoes(usuario_id, tipo, status);

-- ---------------------------------------------------------------------
-- TRIGGERS — garantem que a categoria escolhida seja do mesmo tipo
-- da transação (ex.: não deixar lançar despesa numa categoria de receita)
-- ---------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_transacoes_categoria_tipo_insert
BEFORE INSERT ON transacoes
FOR EACH ROW
BEGIN
  DECLARE tipo_categoria ENUM('despesa','receita');
  SELECT tipo INTO tipo_categoria FROM categorias WHERE id = NEW.categoria_id;
  IF tipo_categoria IS NULL OR tipo_categoria <> NEW.tipo THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A categoria escolhida não é do mesmo tipo da transação (despesa/receita).';
  END IF;
END$$

CREATE TRIGGER trg_transacoes_categoria_tipo_update
BEFORE UPDATE ON transacoes
FOR EACH ROW
BEGIN
  DECLARE tipo_categoria ENUM('despesa','receita');
  SELECT tipo INTO tipo_categoria FROM categorias WHERE id = NEW.categoria_id;
  IF tipo_categoria IS NULL OR tipo_categoria <> NEW.tipo THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'A categoria escolhida não é do mesmo tipo da transação (despesa/receita).';
  END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- VIEW — balanço mensal por data de competência (usada no Dashboard)
-- ---------------------------------------------------------------------
CREATE VIEW vw_balanco_mensal AS
SELECT
  usuario_id,
  YEAR(data)  AS ano,
  MONTH(data) AS mes,
  SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total_receitas,
  SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS total_despesas,
  SUM(CASE WHEN tipo = 'despesa' AND status = 'pagar' THEN valor ELSE 0 END) AS total_pendente,
  SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) AS saldo
FROM transacoes
GROUP BY usuario_id, YEAR(data), MONTH(data);
