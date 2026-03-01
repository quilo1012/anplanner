
-- Create operation_time table for future OEE time-tracking
CREATE TABLE public.operation_time (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.production_sessions(id) ON DELETE SET NULL,
  line text NOT NULL,
  date date NOT NULL,
  shift_type text NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  downtime_minutes integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_operation_time_line_date ON public.operation_time(line, date);

-- Enable RLS
ALTER TABLE public.operation_time ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users
CREATE POLICY "Authenticated users can view operation_time"
  ON public.operation_time FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: supervisors and admins
CREATE POLICY "Supervisors and admins can insert operation_time"
  ON public.operation_time FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- UPDATE: supervisors and admins
CREATE POLICY "Supervisors and admins can update operation_time"
  ON public.operation_time FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- DELETE: supervisors and admins
CREATE POLICY "Supervisors and admins can delete operation_time"
  ON public.operation_time FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
