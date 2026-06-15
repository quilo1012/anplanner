-- De-duplicate any accidental duplicates before adding the unique constraint.
-- Keep the most recently updated session per (line, date, shift); reassign items
-- and downtimes to the kept session, then delete the older duplicates.
WITH ranked AS (
  SELECT id,
         production_line,
         date,
         shift_type,
         ROW_NUMBER() OVER (
           PARTITION BY production_line, date, shift_type
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
         ) AS rn
    FROM public.production_sessions
),
keepers AS (
  SELECT production_line, date, shift_type, id AS keeper_id
    FROM ranked WHERE rn = 1
),
dupes AS (
  SELECT r.id AS dupe_id, k.keeper_id
    FROM ranked r
    JOIN keepers k
      ON k.production_line = r.production_line
     AND k.date = r.date
     AND k.shift_type = r.shift_type
   WHERE r.rn > 1
)
UPDATE public.production_items pi
   SET session_id = d.keeper_id
  FROM dupes d
 WHERE pi.session_id = d.dupe_id;

WITH ranked AS (
  SELECT id, production_line, date, shift_type,
         ROW_NUMBER() OVER (
           PARTITION BY production_line, date, shift_type
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
         ) AS rn
    FROM public.production_sessions
)
DELETE FROM public.structured_downtimes sd
 USING ranked r
 WHERE sd.session_id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, production_line, date, shift_type,
         ROW_NUMBER() OVER (
           PARTITION BY production_line, date, shift_type
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
         ) AS rn
    FROM public.production_sessions
)
DELETE FROM public.production_sessions ps
 USING ranked r
 WHERE ps.id = r.id AND r.rn > 1;

ALTER TABLE public.production_sessions
  ADD CONSTRAINT production_sessions_line_date_shift_unique
  UNIQUE (production_line, date, shift_type);