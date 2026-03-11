UPDATE production_sessions 
SET date = '2026-03-09', updated_at = now()
WHERE line_leader = 'Imported' AND date = '2026-09-03';