
-- Phase 1: Create production_sessions table
CREATE TABLE public.production_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_line text NOT NULL,
  date date NOT NULL,
  shift_type text NOT NULL,
  line_leader text NOT NULL,
  staff_planned integer DEFAULT 0,
  staff_actual integer DEFAULT 0,
  planned_quantity integer DEFAULT 0,
  comments text,
  monitoring_photo_url text,
  created_by uuid,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: 1 session per line/date/shift
CREATE UNIQUE INDEX idx_sessions_unique ON public.production_sessions(production_line, date, shift_type);

-- Phase 2: Create production_items table
CREATE TABLE public.production_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.production_sessions(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text DEFAULT '',
  quantity_target integer DEFAULT 0,
  quantity_actual integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_session ON public.production_items(session_id);
CREATE INDEX idx_items_sku ON public.production_items(sku);

-- Phase 3: Migrate existing shifts data into production_sessions
-- Group shifts by (production_line, date, shift_type) -> 1 session per group
INSERT INTO public.production_sessions (
  id, production_line, date, shift_type, line_leader, 
  staff_planned, staff_actual, planned_quantity, comments, 
  monitoring_photo_url, created_by, is_archived, created_at, updated_at
)
SELECT 
  -- Use the first shift's id as the session id for FK re-linking
  (array_agg(id ORDER BY created_at ASC))[1],
  production_line,
  date,
  shift_type,
  -- Use the leader from the first shift
  (array_agg(line_leader ORDER BY created_at ASC))[1],
  -- Sum staff (but use max since it's per-line not per-SKU)
  COALESCE(MAX(staff_planned), 0),
  COALESCE(MAX(staff_actual), 0),
  -- Sum planned quantities across all SKUs
  COALESCE(SUM(planned_quantity), 0),
  -- Use comments from the first shift that has them
  (array_agg(comments ORDER BY created_at ASC) FILTER (WHERE comments IS NOT NULL AND comments != ''))[1],
  -- Use photo from the first shift that has one
  (array_agg(monitoring_photo_url ORDER BY created_at ASC) FILTER (WHERE monitoring_photo_url IS NOT NULL))[1],
  -- Use created_by from the first shift
  (array_agg(created_by ORDER BY created_at ASC))[1],
  bool_or(is_archived),
  MIN(created_at),
  MAX(updated_at)
FROM public.shifts
GROUP BY production_line, date, shift_type;

-- Phase 4: Migrate shift rows into production_items
INSERT INTO public.production_items (session_id, sku, product_name, quantity_target, quantity_actual, created_at)
SELECT 
  ps.id,
  COALESCE(s.sku, ''),
  s.product_name,
  s.planned_quantity,
  s.real_production,
  s.created_at
FROM public.shifts s
JOIN public.production_sessions ps 
  ON ps.production_line = s.production_line 
  AND ps.date = s.date 
  AND ps.shift_type = s.shift_type;

-- Phase 5: Re-link structured_downtimes to production_sessions
ALTER TABLE public.structured_downtimes ADD COLUMN session_id uuid;

-- Populate session_id from shift_id mapping
UPDATE public.structured_downtimes sd
SET session_id = ps.id
FROM public.shifts s
JOIN public.production_sessions ps 
  ON ps.production_line = s.production_line 
  AND ps.date = s.date 
  AND ps.shift_type = s.shift_type
WHERE sd.shift_id = s.id;

-- Make session_id NOT NULL and add FK
ALTER TABLE public.structured_downtimes 
  ALTER COLUMN session_id SET NOT NULL;

ALTER TABLE public.structured_downtimes 
  ADD CONSTRAINT structured_downtimes_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES public.production_sessions(id) ON DELETE CASCADE;

CREATE INDEX idx_downtimes_session ON public.structured_downtimes(session_id);

-- Drop old shift_id column and FK
ALTER TABLE public.structured_downtimes DROP CONSTRAINT structured_downtimes_shift_id_fkey;
ALTER TABLE public.structured_downtimes DROP COLUMN shift_id;

-- Phase 6: RLS for production_sessions
ALTER TABLE public.production_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sessions"
  ON public.production_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supervisors and admins can insert sessions"
  ON public.production_sessions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors and admins can update sessions"
  ON public.production_sessions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors and admins can delete sessions"
  ON public.production_sessions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Phase 7: RLS for production_items
ALTER TABLE public.production_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view items"
  ON public.production_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Supervisors and admins can insert items"
  ON public.production_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors and admins can update items"
  ON public.production_items FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors and admins can delete items"
  ON public.production_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Phase 8: Update structured_downtimes RLS to use session_id pattern
-- (existing policies still work since they check user role, not shift_id)

-- Phase 9: Updated_at trigger for production_sessions
CREATE TRIGGER update_production_sessions_updated_at
  BEFORE UPDATE ON public.production_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 10: Drop old shifts table (data already migrated)
DROP TABLE public.shifts CASCADE;
