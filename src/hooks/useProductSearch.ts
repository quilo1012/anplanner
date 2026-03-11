import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProductResult {
  product_code: string;
  product_description: string;
  weight_per_unit: number | null;
}

export function useProductSearch(query: string) {
  const [results, setResults] = useState<ProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous request
    abortRef.current?.abort();

    if (!query || query.trim().length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;

      try {
        const q = query.trim();
        const { data, error } = await supabase
          .from('products')
          .select('product_code, product_description, weight_per_unit')
          .or(`product_code.ilike.%${q}%,product_description.ilike.%${q}%`)
          .order('product_code')
          .limit(20);

        if (controller.signal.aborted) return;

        if (error) {
          console.error('[ProductSearch] Error:', error);
          setResults([]);
        } else {
          // Sort: prefix matches first, then substring
          const lowerQ = q.toLowerCase();
          const prefix: ProductResult[] = [];
          const substring: ProductResult[] = [];
          (data || []).forEach(p => {
            if (
              p.product_code.toLowerCase().startsWith(lowerQ) ||
              p.product_description.toLowerCase().startsWith(lowerQ)
            ) {
              prefix.push(p);
            } else {
              substring.push(p);
            }
          });
          setResults([...prefix, ...substring]);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('[ProductSearch] Failed:', err);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, isLoading };
}

/** Batch lookup products by exact product_code list */
export async function batchLookupProducts(skuList: string[]) {
  if (skuList.length === 0) return new Map<string, { sku: string; name: string }>();
  
  const { data } = await supabase
    .from('products')
    .select('product_code, product_description')
    .in('product_code', skuList);

  const map = new Map<string, { sku: string; name: string }>();
  (data || []).forEach(p => {
    map.set(p.product_code.toLowerCase(), { sku: p.product_code, name: p.product_description });
  });
  return map;
}
