ALTER TABLE public.production_plans ADD COLUMN batch_number text;
ALTER TABLE public.production_plans ADD COLUMN blender_size numeric DEFAULT 0;
ALTER TABLE public.products ADD COLUMN weight_per_unit numeric DEFAULT 0;