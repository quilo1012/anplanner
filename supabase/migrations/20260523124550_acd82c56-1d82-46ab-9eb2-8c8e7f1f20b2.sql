ALTER TABLE public.production_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.production_items REPLICA IDENTITY FULL;
ALTER TABLE public.structured_downtimes REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.production_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.production_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.structured_downtimes; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;