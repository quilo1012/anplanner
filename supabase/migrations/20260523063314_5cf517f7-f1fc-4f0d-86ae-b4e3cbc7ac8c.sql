
-- 1. Profiles: restrict SELECT to own profile + admins
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. user_roles: explicit block on non-admin writes (restrictive policy)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Rescope policies from {public} to {authenticated}
-- operation_time
DROP POLICY IF EXISTS "Authenticated users can view operation_time" ON public.operation_time;
CREATE POLICY "Authenticated users can view operation_time" ON public.operation_time
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors and admins can insert operation_time" ON public.operation_time;
CREATE POLICY "Supervisors and admins can insert operation_time" ON public.operation_time
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Supervisors and admins can update operation_time" ON public.operation_time;
CREATE POLICY "Supervisors and admins can update operation_time" ON public.operation_time
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Supervisors and admins can delete operation_time" ON public.operation_time;
CREATE POLICY "Supervisors and admins can delete operation_time" ON public.operation_time
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

-- production_sessions
DROP POLICY IF EXISTS "Authenticated users can view sessions" ON public.production_sessions;
CREATE POLICY "Authenticated users can view sessions" ON public.production_sessions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors and admins can insert sessions" ON public.production_sessions;
CREATE POLICY "Supervisors and admins can insert sessions" ON public.production_sessions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Supervisors and admins can update sessions" ON public.production_sessions;
CREATE POLICY "Supervisors and admins can update sessions" ON public.production_sessions
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Supervisors and admins can delete sessions" ON public.production_sessions;
CREATE POLICY "Supervisors and admins can delete sessions" ON public.production_sessions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Operators can update their own sessions" ON public.production_sessions;
CREATE POLICY "Operators can update their own sessions" ON public.production_sessions
  FOR UPDATE TO authenticated
  USING (
    lower(trim(line_leader)) = lower(trim((SELECT name FROM profiles WHERE id = auth.uid())))
    AND has_role(auth.uid(),'operator'::app_role)
  );

-- production_items
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.production_items;
CREATE POLICY "Authenticated users can view items" ON public.production_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors and admins can insert items" ON public.production_items;
CREATE POLICY "Supervisors and admins can insert items" ON public.production_items
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Supervisors and admins can update items" ON public.production_items;
CREATE POLICY "Supervisors and admins can update items" ON public.production_items
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Supervisors and admins can delete items" ON public.production_items;
CREATE POLICY "Supervisors and admins can delete items" ON public.production_items
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Operators can update their own items" ON public.production_items;
CREATE POLICY "Operators can update their own items" ON public.production_items
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM production_sessions ps JOIN profiles p ON p.id = auth.uid()
      WHERE ps.id = production_items.session_id
        AND lower(trim(ps.line_leader)) = lower(trim(p.name))))
    AND has_role(auth.uid(),'operator'::app_role)
  );

-- products
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors and admins can insert products" ON public.products;
CREATE POLICY "Supervisors and admins can insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Supervisors and admins can update products" ON public.products;
CREATE POLICY "Supervisors and admins can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- downtime_categories
DROP POLICY IF EXISTS "Authenticated can view categories" ON public.downtime_categories;
CREATE POLICY "Authenticated can view categories" ON public.downtime_categories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors can insert categories" ON public.downtime_categories;
CREATE POLICY "Supervisors can insert categories" ON public.downtime_categories
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

-- downtime_reasons
DROP POLICY IF EXISTS "Authenticated can view reasons" ON public.downtime_reasons;
CREATE POLICY "Authenticated can view reasons" ON public.downtime_reasons
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors can insert reasons" ON public.downtime_reasons;
CREATE POLICY "Supervisors can insert reasons" ON public.downtime_reasons
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));

-- structured_downtimes (DELETE for sup/admin was on {public})
DROP POLICY IF EXISTS "Supervisors and admins can delete downtimes" ON public.structured_downtimes;
CREATE POLICY "Supervisors and admins can delete downtimes" ON public.structured_downtimes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role));
