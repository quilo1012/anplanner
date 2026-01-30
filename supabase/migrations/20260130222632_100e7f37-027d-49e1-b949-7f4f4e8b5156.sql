-- Add staffing fields to shifts table for supervisor reporting
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS staff_planned integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS staff_actual integer DEFAULT 0;

-- Add comment to explain the fields
COMMENT ON COLUMN public.shifts.staff_planned IS 'Number of employees planned for this production line/shift';
COMMENT ON COLUMN public.shifts.staff_actual IS 'Number of employees who actually worked on this production line/shift';