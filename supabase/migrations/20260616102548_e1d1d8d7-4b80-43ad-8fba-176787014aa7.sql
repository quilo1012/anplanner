DROP POLICY IF EXISTS "Authenticated can view engineer_scores" ON public.engineer_scores;
DROP POLICY IF EXISTS "Admins managers can manage engineer_scores" ON public.engineer_scores;

CREATE POLICY "Engineers see own score"
  ON public.engineer_scores FOR SELECT TO authenticated
  USING (engineer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Managers can view all scores"
  ON public.engineer_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Admins can manage scores"
  ON public.engineer_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Managers can manage scores"
  ON public.engineer_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));