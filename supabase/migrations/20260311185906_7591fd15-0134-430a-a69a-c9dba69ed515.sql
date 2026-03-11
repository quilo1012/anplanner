
-- For sessions with wrong date where correct session already exists: move items, then delete
-- First, move production_items from wrong-date sessions to correct-date sessions
-- Handle 2026-08-03 → 2026-03-08
UPDATE production_items pi
SET session_id = correct.id
FROM production_sessions wrong
JOIN production_sessions correct 
  ON correct.production_line = wrong.production_line 
  AND correct.shift_type = wrong.shift_type
  AND correct.date = '2026-03-08'
WHERE wrong.date = '2026-08-03' 
  AND wrong.line_leader = 'Imported'
  AND pi.session_id = wrong.id
  AND NOT EXISTS (
    SELECT 1 FROM production_items existing 
    WHERE existing.session_id = correct.id AND existing.sku = pi.sku
  );

-- Update quantity_actual on existing items in correct session from wrong session duplicates
UPDATE production_items existing
SET quantity_actual = dup.quantity_actual
FROM production_items dup
JOIN production_sessions wrong ON dup.session_id = wrong.id
JOIN production_sessions correct ON correct.production_line = wrong.production_line 
  AND correct.shift_type = wrong.shift_type AND correct.date = '2026-03-08'
WHERE wrong.date = '2026-08-03' AND wrong.line_leader = 'Imported'
  AND existing.session_id = correct.id AND existing.sku = dup.sku;

-- Delete remaining items on wrong sessions (already merged)
DELETE FROM production_items WHERE session_id IN (
  SELECT id FROM production_sessions WHERE date = '2026-08-03' AND line_leader = 'Imported'
);

-- Delete wrong sessions for 08-03
DELETE FROM production_sessions WHERE date = '2026-08-03' AND line_leader = 'Imported';

-- Same for 2026-09-03 → 2026-03-09
UPDATE production_items pi
SET session_id = correct.id
FROM production_sessions wrong
JOIN production_sessions correct 
  ON correct.production_line = wrong.production_line 
  AND correct.shift_type = wrong.shift_type
  AND correct.date = '2026-03-09'
WHERE wrong.date = '2026-09-03' 
  AND wrong.line_leader = 'Imported'
  AND pi.session_id = wrong.id
  AND NOT EXISTS (
    SELECT 1 FROM production_items existing 
    WHERE existing.session_id = correct.id AND existing.sku = pi.sku
  );

UPDATE production_items existing
SET quantity_actual = dup.quantity_actual
FROM production_items dup
JOIN production_sessions wrong ON dup.session_id = wrong.id
JOIN production_sessions correct ON correct.production_line = wrong.production_line 
  AND correct.shift_type = wrong.shift_type AND correct.date = '2026-03-09'
WHERE wrong.date = '2026-09-03' AND wrong.line_leader = 'Imported'
  AND existing.session_id = correct.id AND existing.sku = dup.sku;

DELETE FROM production_items WHERE session_id IN (
  SELECT id FROM production_sessions WHERE date = '2026-09-03' AND line_leader = 'Imported'
);

DELETE FROM production_sessions WHERE date = '2026-09-03' AND line_leader = 'Imported';

-- For any remaining wrong-date sessions without conflicts, just update the date
UPDATE production_sessions SET date = '2026-03-08' WHERE date = '2026-08-03' AND line_leader = 'Imported';
UPDATE production_sessions SET date = '2026-03-09' WHERE date = '2026-09-03' AND line_leader = 'Imported';
