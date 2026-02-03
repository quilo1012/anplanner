-- Remover constraint antiga
ALTER TABLE structured_downtimes 
DROP CONSTRAINT IF EXISTS structured_downtimes_category_check;

-- Adicionar nova constraint com categorias corretas
ALTER TABLE structured_downtimes 
ADD CONSTRAINT structured_downtimes_category_check 
CHECK (category = ANY (ARRAY[
  'maintenance'::text, 
  'quality'::text, 
  'health_safety'::text, 
  'warehouse'::text, 
  'staff'::text, 
  'other'::text
]));