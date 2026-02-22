-- Operator downtime RLS policies
CREATE POLICY "Operators can insert downtimes on own sessions"
ON public.structured_downtimes FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'operator'::app_role)
  AND EXISTS (
    SELECT 1 FROM production_sessions ps
    JOIN profiles p ON p.id = auth.uid()
    WHERE ps.id = structured_downtimes.session_id
    AND lower(TRIM(BOTH FROM ps.line_leader)) = lower(TRIM(BOTH FROM p.name))
  )
);

CREATE POLICY "Operators can delete downtimes on own sessions"
ON public.structured_downtimes FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role)
  AND EXISTS (
    SELECT 1 FROM production_sessions ps
    JOIN profiles p ON p.id = auth.uid()
    WHERE ps.id = structured_downtimes.session_id
    AND lower(TRIM(BOTH FROM ps.line_leader)) = lower(TRIM(BOTH FROM p.name))
  )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_line_date ON production_sessions(production_line, date);
CREATE INDEX IF NOT EXISTS idx_items_session ON production_items(session_id);
CREATE INDEX IF NOT EXISTS idx_downtimes_session ON structured_downtimes(session_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);