-- =====================================================================
-- POUPEE — Dados de exemplo (mesmo conteúdo do mock em script.js)
-- Rodar depois do schema.sql
-- =====================================================================
USE poupee;

INSERT INTO usuarios (nome, email, senha_hash) VALUES
  ('Thiago Veronez', 'thiago@exemplo.com', '$2y$10$exemplo.de.hash.substituir.no.backend');

SET @usuario_id = LAST_INSERT_ID();

-- Categorias de despesa
INSERT INTO categorias (usuario_id, nome, cor, icone, tipo, ordem) VALUES
  (@usuario_id, 'Moradia',      '#F2600C', '🏠', 'despesa', 1),
  (@usuario_id, 'Alimentação',  '#2F7DBF', '🛒', 'despesa', 2),
  (@usuario_id, 'Transporte',   '#8A5CD6', '⛽', 'despesa', 3),
  (@usuario_id, 'Lazer',        '#D6497D', '🎬', 'despesa', 4),
  (@usuario_id, 'Saúde',        '#3EA37A', '💊', 'despesa', 5),
  (@usuario_id, 'Educação',     '#C9A227', '📚', 'despesa', 6),
  (@usuario_id, 'Outros',       '#6B6B66', '📦', 'despesa', 7);

-- Categorias de receita
INSERT INTO categorias (usuario_id, nome, cor, icone, tipo, ordem) VALUES
  (@usuario_id, 'Renda Fixa',    '#1E8A5F', '💼', 'receita', 8),
  (@usuario_id, 'Renda Extra',   '#3FA36B', '💻', 'receita', 9),
  (@usuario_id, 'Investimentos', '#2F9E82', '📈', 'receita', 10);

-- Despesas
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'despesa', 'Aluguel', 950.00, '2026-09-05', 'pagar' FROM categorias WHERE usuario_id=@usuario_id AND nome='Moradia';
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'despesa', 'Mercado', 386.40, '2026-08-28', 'paga' FROM categorias WHERE usuario_id=@usuario_id AND nome='Alimentação';
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'despesa', 'Combustível', 210.00, '2026-09-18', 'pagar' FROM categorias WHERE usuario_id=@usuario_id AND nome='Transporte';
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'despesa', 'Internet', 99.90, '2026-08-10', 'paga' FROM categorias WHERE usuario_id=@usuario_id AND nome='Moradia';
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'despesa', 'Assinatura streaming', 39.90, '2026-09-22', 'pagar' FROM categorias WHERE usuario_id=@usuario_id AND nome='Lazer';
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'despesa', 'Farmácia', 68.20, '2026-08-14', 'paga' FROM categorias WHERE usuario_id=@usuario_id AND nome='Saúde';

-- Receitas
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'receita', 'Salário', 4200.00, '2026-08-01', 'paga' FROM categorias WHERE usuario_id=@usuario_id AND nome='Renda Fixa';
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'receita', 'Freelance de design', 1500.00, '2026-08-14', 'paga' FROM categorias WHERE usuario_id=@usuario_id AND nome='Renda Extra';
INSERT INTO transacoes (usuario_id, categoria_id, tipo, descricao, valor, data, status)
SELECT @usuario_id, id, 'receita', 'Dividendos', 420.00, '2026-08-20', 'paga' FROM categorias WHERE usuario_id=@usuario_id AND nome='Investimentos';
