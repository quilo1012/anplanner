import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  sku: string;
  name: string;
  weight: number;
}

interface ProductCacheState {
  products: Map<string, Product>;
  lastFetched: Date | null;
  isLoading: boolean;
  isLoaded: boolean;
}

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Singleton cache shared across all hook instances
let globalProductCache: Map<string, Product> = new Map();
let globalLastFetched: Date | null = null;
let globalIsLoading = false;
let globalIsLoaded = false;
let loadPromise: Promise<void> | null = null;

export function useProductCache() {
  const [state, setState] = useState<ProductCacheState>({
    products: globalProductCache,
    lastFetched: globalLastFetched,
    isLoading: globalIsLoading,
    isLoaded: globalIsLoaded,
  });

  const isCacheValid = useCallback(() => {
    if (!globalLastFetched || !globalIsLoaded) return false;
    const age = Date.now() - globalLastFetched.getTime();
    return age < CACHE_DURATION_MS;
  }, []);

  const loadProducts = useCallback(async (force = false) => {
    // If cache is valid and not forcing, skip
    if (!force && isCacheValid()) {
      return;
    }

    // If already loading, wait for existing promise
    if (loadPromise) {
      await loadPromise;
      setState({
        products: globalProductCache,
        lastFetched: globalLastFetched,
        isLoading: false,
        isLoaded: globalIsLoaded,
      });
      return;
    }

    globalIsLoading = true;
    setState(prev => ({ ...prev, isLoading: true }));

    loadPromise = (async () => {
      try {
        const PAGE_SIZE = 1000;
        let allData: { product_code: string; product_description: string }[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('products')
            .select('product_code, product_description, weight_per_unit')
            .order('product_code')
            .range(from, from + PAGE_SIZE - 1);

          if (error) {
            console.error('[ProductCache] Error loading products:', error);
            break;
          }
          allData = allData.concat(data || []);
          hasMore = (data?.length || 0) === PAGE_SIZE;
          from += PAGE_SIZE;
        }

        // Build the Map for O(1) lookup
        globalProductCache = new Map();
        allData.forEach(p => {
          globalProductCache.set(p.product_code.toLowerCase(), {
            sku: p.product_code,
            name: p.product_description,
            weight: p.weight_per_unit ?? 0,
          });
        });

        globalLastFetched = new Date();
        globalIsLoaded = true;

        console.log(`[ProductCache] Loaded ${globalProductCache.size} products`);
      } catch (err) {
        console.error('[ProductCache] Failed to load:', err);
      } finally {
        globalIsLoading = false;
        loadPromise = null;
      }
    })();

    await loadPromise;

    setState({
      products: globalProductCache,
      lastFetched: globalLastFetched,
      isLoading: false,
      isLoaded: globalIsLoaded,
    });
  }, [isCacheValid]);

  // Get product from cache (O(1) lookup)
  const getProduct = useCallback((sku: string): Product | undefined => {
    return globalProductCache.get(sku.toLowerCase());
  }, []);

  // Search products locally (filter on cached Map) — prefix-first sorting
  const searchProducts = useCallback((query: string): Product[] => {
    if (!query || query.length < 1) return [];
    
    const lowerQuery = query.toLowerCase();
    const prefixMatches: Product[] = [];
    const substringMatches: Product[] = [];
    
    globalProductCache.forEach((product) => {
      const skuLower = product.sku.toLowerCase();
      const nameLower = product.name.toLowerCase();
      
      if (skuLower.startsWith(lowerQuery) || nameLower.startsWith(lowerQuery)) {
        prefixMatches.push(product);
      } else if (skuLower.includes(lowerQuery) || nameLower.includes(lowerQuery)) {
        substringMatches.push(product);
      }
    });

    // Prefix matches first, then substring matches, both sorted by SKU
    return [
      ...prefixMatches.sort((a, b) => a.sku.localeCompare(b.sku)),
      ...substringMatches.sort((a, b) => a.sku.localeCompare(b.sku)),
    ].slice(0, 20);
  }, []);

  // Check if exact SKU exists in cache
  const hasProduct = useCallback((sku: string): boolean => {
    return globalProductCache.has(sku.toLowerCase());
  }, []);

  // Add product to cache (when new product is saved)
  const addToCache = useCallback((sku: string, name: string) => {
    globalProductCache.set(sku.toLowerCase(), { sku, name });
    setState(prev => ({ ...prev, products: new Map(globalProductCache) }));
  }, []);

  // Invalidate and reload cache
  const invalidateCache = useCallback(async () => {
    globalLastFetched = null;
    globalIsLoaded = false;
    await loadProducts(true);
  }, [loadProducts]);

  return {
    products: state.products,
    isLoading: state.isLoading,
    isLoaded: state.isLoaded,
    loadProducts,
    getProduct,
    searchProducts,
    hasProduct,
    addToCache,
    invalidateCache,
    isCacheValid,
  };
}
