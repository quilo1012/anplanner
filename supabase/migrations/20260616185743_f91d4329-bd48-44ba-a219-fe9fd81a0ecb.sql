
CREATE POLICY "wo-photos read for staff" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'wo-photos' AND (
    public.has_role(auth.uid(), 'engineer'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
    OR owner = auth.uid()
  )
);

CREATE POLICY "wo-photos insert for engineers and admins" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'wo-photos' AND (
    public.has_role(auth.uid(), 'engineer'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "wo-photos update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wo-photos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'wo-photos' AND owner = auth.uid());

CREATE POLICY "wo-photos delete by admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wo-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
