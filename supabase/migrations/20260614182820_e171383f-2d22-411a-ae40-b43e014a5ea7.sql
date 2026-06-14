ALTER TABLE public.quality_action_types
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium';

ALTER TABLE public.quality_action_types
  DROP CONSTRAINT IF EXISTS quality_action_types_severity_check;

ALTER TABLE public.quality_action_types
  ADD CONSTRAINT quality_action_types_severity_check
  CHECK (severity IN ('low','medium','high','critical'));