-- Índice ÚNICO no product_code (SKU) - garantir lookup rápido
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(product_code);

-- Índice no SKU da shifts para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_shifts_sku ON shifts(sku);

-- Índice no line_leader para filtros por líder
CREATE INDEX IF NOT EXISTS idx_shifts_line_leader ON shifts(line_leader);

-- Índice no reason do downtimes para agregações
CREATE INDEX IF NOT EXISTS idx_downtimes_reason ON structured_downtimes(reason);