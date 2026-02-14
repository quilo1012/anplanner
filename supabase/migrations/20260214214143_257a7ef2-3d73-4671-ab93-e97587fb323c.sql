
-- Allow operators to update production_items (quantity_actual only) for sessions where they are the line leader
CREATE POLICY "Operators can update their own items"
ON public.production_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.production_sessions ps
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ps.id = production_items.session_id
    AND LOWER(TRIM(ps.line_leader)) = LOWER(TRIM(p.name))
  )
  AND has_role(auth.uid(), 'operator'::app_role)
);

-- Allow operators to view production_sessions (already allowed by existing policy)
-- No additional SELECT policy needed

-- Allow operators to update production_sessions for their own sessions (limited)
CREATE POLICY "Operators can update their own sessions"
ON public.production_sessions
FOR UPDATE
USING (
  LOWER(TRIM(line_leader)) = LOWER(TRIM((SELECT name FROM public.profiles WHERE id = auth.uid())))
  AND has_role(auth.uid(), 'operator'::app_role)
);
