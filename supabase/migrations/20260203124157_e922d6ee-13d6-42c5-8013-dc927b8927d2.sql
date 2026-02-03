-- Step 1: Create new products table with correct schema
CREATE TABLE public.products_new (
  product_code TEXT PRIMARY KEY NOT NULL,
  product_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Migrate existing data (handle duplicates by keeping first occurrence)
INSERT INTO public.products_new (product_code, product_description, created_at, updated_at)
SELECT DISTINCT ON (sku) sku, name, created_at, updated_at
FROM public.products
WHERE sku IS NOT NULL AND sku != ''
ORDER BY sku, created_at ASC
ON CONFLICT DO NOTHING;

-- Step 3: Drop old table
DROP TABLE public.products;

-- Step 4: Rename new table to products
ALTER TABLE public.products_new RENAME TO products;

-- Step 5: Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Step 6: Recreate RLS policies
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Supervisors and admins can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors and admins can update products" 
ON public.products 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 7: Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();