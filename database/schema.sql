
CREATE DATABASE IF NOT EXISTS reaproveita
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE reaproveita;

-- =========================================
-- TABELA: ESTABELECIMENTOS
-- =========================================

CREATE TABLE IF NOT EXISTS estabelecimentos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    kind VARCHAR(80) NOT NULL DEFAULT 'Estabelecimento',
    contact_name VARCHAR(120) NULL,
    phone VARCHAR(30) NULL,
    address VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================
-- TABELA: PRODUTOS
-- =========================================

CREATE TABLE IF NOT EXISTS produtos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    establishment_id INT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'Outros',
    description TEXT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'unidade',
    weight_kg DECIMAL(10,3) NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_produtos_estabelecimento
        FOREIGN KEY (establishment_id)
        REFERENCES estabelecimentos(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_produtos_nome (name),
    INDEX idx_produtos_categoria (category)
) ENGINE=InnoDB;

-- =========================================
-- TABELA: LOTES
-- =========================================

CREATE TABLE IF NOT EXISTS lotes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    lot_code VARCHAR(60) NULL,
    quantity_initial DECIMAL(12,3) NOT NULL,
    quantity_available DECIMAL(12,3) NOT NULL,
    expiry_date DATE NOT NULL,
    received_at DATE NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lotes_produto
        FOREIGN KEY (product_id)
        REFERENCES produtos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_lotes_validade (expiry_date),
    INDEX idx_lotes_produto (product_id)
) ENGINE=InnoDB;

-- =========================================
-- TABELA: RESERVAS
-- =========================================

CREATE TABLE IF NOT EXISTS reservas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lot_id INT UNSIGNED NOT NULL,
    reserver_name VARCHAR(150) NOT NULL,
    contact VARCHAR(80) NULL,
    quantity DECIMAL(12,3) NOT NULL,
    status ENUM(
        'pending',
        'confirmed',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',
    reserved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    notes TEXT NULL,

    CONSTRAINT fk_reservas_lote
        FOREIGN KEY (lot_id)
        REFERENCES lotes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_reservas_status (status),
    INDEX idx_reservas_data (reserved_at)
) ENGINE=InnoDB;

-- =========================================
-- DADOS DEMONSTRATIVOS
-- =========================================

INSERT INTO estabelecimentos
    (name, kind, contact_name, phone, address)
SELECT
    'Mercado Exemplo',
    'Mercado',
    'Responsável demonstrativo',
    '(82) 99999-0000',
    'Maceió - AL'
WHERE NOT EXISTS (
    SELECT 1
    FROM estabelecimentos
    WHERE name = 'Mercado Exemplo'
);

-- PRODUTO 1

INSERT INTO produtos
    (establishment_id, name, category, unit, weight_kg)
SELECT
    e.id,
    'Pão integral',
    'Padaria',
    'unidade',
    0.050
FROM estabelecimentos e
WHERE e.name = 'Mercado Exemplo'
AND NOT EXISTS (
    SELECT 1 FROM produtos p
    WHERE p.name = 'Pão integral'
);

-- PRODUTO 2

INSERT INTO produtos
    (establishment_id, name, category, unit, weight_kg)
SELECT
    e.id,
    'Bolo de milho',
    'Padaria',
    'unidade',
    0.080
FROM estabelecimentos e
WHERE e.name = 'Mercado Exemplo'
AND NOT EXISTS (
    SELECT 1 FROM produtos p
    WHERE p.name = 'Bolo de milho'
);

-- PRODUTO 3

INSERT INTO produtos
    (establishment_id, name, category, unit, weight_kg)
SELECT
    e.id,
    'Arroz integral',
    'Mercearia',
    'pacote',
    1.000
FROM estabelecimentos e
WHERE e.name = 'Mercado Exemplo'
AND NOT EXISTS (
    SELECT 1 FROM produtos p
    WHERE p.name = 'Arroz integral'
);

-- LOTE 1: PÃO INTEGRAL

INSERT INTO lotes
    (product_id, lot_code, quantity_initial, quantity_available, expiry_date, received_at)
SELECT
    p.id,
    'LOTE-DEMO-001',
    15,
    15,
    DATE_ADD(CURDATE(), INTERVAL 2 DAY),
    CURDATE()
FROM produtos p
WHERE p.name = 'Pão integral'
AND NOT EXISTS (
    SELECT 1 FROM lotes l
    WHERE l.lot_code = 'LOTE-DEMO-001'
);

-- LOTE 2: BOLO DE MILHO

INSERT INTO lotes
    (product_id, lot_code, quantity_initial, quantity_available, expiry_date, received_at)
SELECT
    p.id,
    'LOTE-DEMO-002',
    8,
    8,
    DATE_ADD(CURDATE(), INTERVAL 3 DAY),
    CURDATE()
FROM produtos p
WHERE p.name = 'Bolo de milho'
AND NOT EXISTS (
    SELECT 1 FROM lotes l
    WHERE l.lot_code = 'LOTE-DEMO-002'
);

-- LOTE 3: ARROZ INTEGRAL

INSERT INTO lotes
    (product_id, lot_code, quantity_initial, quantity_available, expiry_date, received_at)
SELECT
    p.id,
    'LOTE-DEMO-003',
    25,
    25,
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    CURDATE()
FROM produtos p
WHERE p.name = 'Arroz integral'
AND NOT EXISTS (
    SELECT 1 FROM lotes l
    WHERE l.lot_code = 'LOTE-DEMO-003'
);

-- =========================================
-- CONFERÊNCIA DAS TABELAS
-- =========================================

SHOW TABLES;
