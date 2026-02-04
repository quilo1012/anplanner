-- Atualizar politica de delete em shifts para incluir supervisors
DROP POLICY IF EXISTS "Admins can delete shifts" ON public.shifts;
CREATE POLICY "Supervisors and admins can delete shifts"
  ON public.shifts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Atualizar politica de delete em structured_downtimes para incluir supervisors
DROP POLICY IF EXISTS "Admins can delete downtimes" ON public.structured_downtimes;
CREATE POLICY "Supervisors and admins can delete downtimes"
  ON public.structured_downtimes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));