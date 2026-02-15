-- Restore broad profile read access for all authenticated users (factory floor app)
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Restore the original policy: all authenticated users can view profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);