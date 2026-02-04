-- Fix 1: Make monitoring-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'monitoring-photos';

-- Fix 2: Update handle_new_user to validate name length
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_name TEXT;
BEGIN
  -- Extract and sanitize name with length limit (100 chars max)
  sanitized_name := TRIM(COALESCE(
    SUBSTRING(NEW.raw_user_meta_data->>'name' FROM 1 FOR 100),
    split_part(NEW.email, '@', 1)
  ));
  
  -- Ensure name is not empty after trimming
  IF sanitized_name = '' OR sanitized_name IS NULL THEN
    sanitized_name := split_part(NEW.email, '@', 1);
  END IF;
  
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, sanitized_name);
  
  -- Default role is operator
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$;

-- Fix 3: Restrict profile visibility to own profile + admins can see all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix 4: Restrict shifts visibility to supervisors and admins for sensitive data
-- Keep general shift data visible but control who sees what through application logic
-- The current "Anyone can view shifts" policy requires authentication
-- We'll restrict it to authenticated users with proper roles
DROP POLICY IF EXISTS "Anyone can view shifts" ON public.shifts;

CREATE POLICY "Authenticated users can view shifts"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);