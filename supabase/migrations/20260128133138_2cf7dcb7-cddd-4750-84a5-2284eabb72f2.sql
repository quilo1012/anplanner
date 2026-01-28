-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'operator');

-- 2. Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. Create shifts table
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
  production_line TEXT NOT NULL,
  line_leader TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  planned_quantity INTEGER NOT NULL DEFAULT 0,
  real_production INTEGER NOT NULL DEFAULT 0,
  performance NUMERIC(5,2) NOT NULL DEFAULT 0,
  comments TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  monitoring_photo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create structured_downtimes table
CREATE TABLE public.structured_downtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('machine', 'material', 'people', 'process', 'other')),
  reason TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_downtimes ENABLE ROW LEVEL SECURITY;

-- 7. Create security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 8. Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 9. Profiles RLS policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. User roles RLS policies
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. Shifts RLS policies
CREATE POLICY "Anyone can view shifts"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supervisors and admins can insert shifts"
  ON public.shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Supervisors and admins can update shifts"
  ON public.shifts FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Admins can delete shifts"
  ON public.shifts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 12. Structured downtimes RLS policies
CREATE POLICY "Anyone can view downtimes"
  ON public.structured_downtimes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supervisors and admins can insert downtimes"
  ON public.structured_downtimes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Supervisors and admins can update downtimes"
  ON public.structured_downtimes FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Admins can delete downtimes"
  ON public.structured_downtimes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 13. Create trigger for automatic profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  
  -- Default role is operator
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Create storage bucket for monitoring photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('monitoring-photos', 'monitoring-photos', true);

-- 16. Storage policies for monitoring photos
CREATE POLICY "Anyone can view monitoring photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'monitoring-photos');

CREATE POLICY "Supervisors and admins can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'monitoring-photos' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  );

CREATE POLICY "Supervisors and admins can update photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'monitoring-photos' AND
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  );

CREATE POLICY "Admins can delete photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'monitoring-photos' AND public.has_role(auth.uid(), 'admin'));