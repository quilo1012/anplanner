DROP POLICY IF EXISTS "Anplanner leaders can view their own WOs" ON public.work_orders;

CREATE POLICY "Anplanner leaders can view their own WOs"
  ON public.work_orders FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'operator'::public.app_role)
    AND (
      operator_id = auth.uid()
      OR requester_name = (SELECT p.name FROM public.profiles p WHERE p.id = auth.uid())
    )
  );