CREATE POLICY "Supervisors can view WOs"
  ON public.work_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::public.app_role));

CREATE POLICY "Supervisors can create WOs"
  ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'::public.app_role));