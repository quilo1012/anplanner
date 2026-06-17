import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export interface SparePart {
  id: string;
  name: string;
  code: string;
  quantity: number;
  min_stock: number;
  category: string;
  price: number;
  line: string | null;
}

export function useSpareParts() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('spare_parts' as never)
        .select('*')
        .order('name', { ascending: true });
      if (fetchError) throw fetchError;
      setParts((data || []) as unknown as SparePart[]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const lowStockCount = parts.filter(p => p.quantity <= p.min_stock).length;

  return { parts, isLoading, error, refreshParts: fetchParts, lowStockCount };
}
