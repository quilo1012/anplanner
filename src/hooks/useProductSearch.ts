import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProductCache } from './useProductCache';

interface ProductResult {
  product_code: string;
  product_description: string;
  weight_per_unit: number | null;
}

/** Sanitize query for ilike to prevent injection */
function sanitizeIlike(q: string): string {
  return q.replace(/[%_\\]/g, c => `\\${c}`);
}

export function useProductSearch(query: string) {
  const [results, setResults] = useState<ProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { isLoaded, loadProducts, searchProducts } = useProductCache();

  // Trigger cache load on first use (non-blocking)
  useEffect(() => {
    if (!isLoaded) {
      loadProducts();
    }
  }, [isLoaded, loadProducts]);

  useEffect(() => {
    abortRef.current?.abort();

    if (!query || query.trim().length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // If cache is loaded, use instant local search (no network)
    if (isLoaded) {
      const cached = searchProducts(query.trim());
      setResults(cached.map(p => ({
        product_code: p.sku,
        product_description: p.name,
        weight_per_unit: p.weight ?? null,
      })));
      setIsLoading(false);
      return;
    }

    // Fallback: server-side search if cache isn't ready yet
    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const safetyTimer = setTimeout(() => {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }, 5000);

    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;

      try {
        const q = sanitizeIlike(query.trim());
        const { data, error } = await supabase
          .from('products')
          .select('product_code, product_description, weight_per_unit')
          .or(`product_code.ilike.%${q}%,product_description.ilike.%${q}%`)
          .order('product_code')
          .limit(20);

        if (controller.signal.aborted) return;

        if (error) {
          console.error('[ProductSearch] DB error:', error);
          setResults([]);
        } else {
          const lowerQ = query.trim().toLowerCase();
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
        console.error('[ProductSearch] Failed:', err);
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
      controller.abort();
    };
  }, [query, isLoaded, searchProducts]);

  return { results, isLoading };
}

/** Immediate exact-match lookup (no debounce) */
export async function lookupExactProduct(productCode: string): Promise<ProductResult | null> {
  if (!productCode?.trim()) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_code, product_description, weight_per_unit')
      .eq('product_code', productCode.trim())
      .maybeSingle();
    if (error) {
      console.error('[ProductSearch] Exact lookup error:', error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error('[ProductSearch] Exact lookup failed:', err);
    return null;
  }
}

/** Batch lookup products by exact product_code list */
export async function batchLookupProducts(skuList: string[]) {
  if (skuList.length === 0) return new Map<string, { sku: string; name: string }>();
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_code, product_description')
      .in('product_code', skuList);

    if (error) {
      console.error('[ProductSearch] Batch lookup error:', error);
    }

    const map = new Map<string, { sku: string; name: string }>();
    (data || []).forEach(p => {
      map.set(p.product_code.toLowerCase(), { sku: p.product_code, name: p.product_description });
    });
    return map;
  } catch (err) {
    console.error('[ProductSearch] Batch lookup failed:', err);
    return new Map<string, { sku: string; name: string }>();
  }
}
