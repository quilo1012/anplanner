-- Performance indexes for shifts table (fast filtering by date, shift, line)
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_type ON shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_shifts_production_line ON shifts(production_line);
CREATE INDEX IF NOT EXISTS idx_shifts_date_shift_line ON shifts(date, shift_type, production_line);
CREATE INDEX IF NOT EXISTS idx_shifts_created_by ON shifts(created_by);

-- Performance indexes for structured_downtimes table
CREATE INDEX IF NOT EXISTS idx_downtimes_shift_id ON structured_downtimes(shift_id);
CREATE INDEX IF NOT EXISTS idx_downtimes_category ON structured_downtimes(category);

-- Performance index for products table (text search on description)
CREATE INDEX IF NOT EXISTS idx_products_description ON products(product_description);