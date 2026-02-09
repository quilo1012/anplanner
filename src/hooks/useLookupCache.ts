import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DOWNTIME_CATEGORIES_FALLBACK, 
  DOWNTIME_REASONS_FALLBACK, 
  DowntimeCategoryItem, 
  DowntimeReason 
} from '@/types/downtime';
import { toast } from 'sonner';

interface LookupCacheState {
  lines: string[];
  leaders: string[];
  categories: DowntimeCategoryItem[];
  reasonsByCategory: Record<string, DowntimeReason[]>;
  isLoading: boolean;
  isLoaded: boolean;
  lastFetched: Date | null;
}

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Singleton cache
let globalLines: string[] = [];
let globalLeaders: string[] = [];
let globalCategories: DowntimeCategoryItem[] = DOWNTIME_CATEGORIES_FALLBACK;
let globalReasonsByCategory: Record<string, DowntimeReason[]> = { ...DOWNTIME_REASONS_FALLBACK };
let globalLastFetched: Date | null = null;
let globalIsLoading = false;
let globalIsLoaded = false;
let loadPromise: Promise<void> | null = null;

// State update listeners
let listeners: Array<() => void> = [];
function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function useLookupCache() {
  const [state, setState] = useState<LookupCacheState>({
    lines: globalLines,
    leaders: globalLeaders,
    categories: globalCategories,
    reasonsByCategory: globalReasonsByCategory,
    isLoading: globalIsLoading,
    isLoaded: globalIsLoaded,
    lastFetched: globalLastFetched,
  });

  // Subscribe to global updates
  useEffect(() => {
    const sync = () => {
      setState({
        lines: globalLines,
        leaders: globalLeaders,
        categories: globalCategories,
        reasonsByCategory: globalReasonsByCategory,
        isLoading: globalIsLoading,
        isLoaded: globalIsLoaded,
        lastFetched: globalLastFetched,
      });
    };
    listeners.push(sync);
    return () => { listeners = listeners.filter(l => l !== sync); };
  }, []);

  const isCacheValid = useCallback(() => {
    if (!globalLastFetched || !globalIsLoaded) return false;
    return Date.now() - globalLastFetched.getTime() < CACHE_DURATION_MS;
  }, []);

  const loadLookups = useCallback(async (force = false) => {
    if (!force && isCacheValid()) return;

    if (loadPromise) {
      await loadPromise;
      notifyListeners();
      return;
    }

    globalIsLoading = true;
    notifyListeners();

    loadPromise = (async () => {
      try {
        // Parallel fetch: shifts, categories, reasons
        const [shiftsRes, catsRes, reasonsRes] = await Promise.all([
          supabase.from('shifts').select('production_line, line_leader'),
          supabase.from('downtime_categories').select('name, label'),
          supabase.from('downtime_reasons').select('category_name, name, label'),
        ]);

        // Lines & Leaders
        if (!shiftsRes.error && shiftsRes.data) {
          const linesSet = new Set<string>();
          const leadersSet = new Set<string>();
          shiftsRes.data.forEach(s => {
            if (s.production_line) linesSet.add(s.production_line);
            if (s.line_leader) leadersSet.add(s.line_leader);
          });
          globalLines = Array.from(linesSet).sort();
          globalLeaders = Array.from(leadersSet).sort();
        }

        // Categories
        if (!catsRes.error && catsRes.data && catsRes.data.length > 0) {
          globalCategories = catsRes.data
            .map(c => ({ value: c.name, label: c.label }))
            .sort((a, b) => a.label.localeCompare(b.label));
        }

        // Reasons grouped by category
        if (!reasonsRes.error && reasonsRes.data && reasonsRes.data.length > 0) {
          const grouped: Record<string, DowntimeReason[]> = {};
          reasonsRes.data.forEach(r => {
            const cat = r.category_name;
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ value: r.name, label: r.label });
          });
          // Sort reasons within each category
          Object.keys(grouped).forEach(k => {
            grouped[k].sort((a, b) => a.label.localeCompare(b.label));
          });
          globalReasonsByCategory = grouped;
        }

        globalLastFetched = new Date();
        globalIsLoaded = true;
        console.log(`[LookupCache] Loaded ${globalLines.length} lines, ${globalLeaders.length} leaders, ${globalCategories.length} categories`);
      } catch (err) {
        console.error('[LookupCache] Failed to load:', err);
      } finally {
        globalIsLoading = false;
        loadPromise = null;
      }
    })();

    await loadPromise;
    notifyListeners();
  }, [isCacheValid]);

  const addLine = useCallback((line: string) => {
    if (!globalLines.includes(line)) {
      globalLines = [...globalLines, line].sort();
      notifyListeners();
    }
  }, []);

  const addLeader = useCallback((leader: string) => {
    if (!globalLeaders.includes(leader)) {
      globalLeaders = [...globalLeaders, leader].sort();
      notifyListeners();
    }
  }, []);

  // Add new category: upsert to DB + update cache instantly
  const addCategory = useCallback(async (label: string): Promise<string | null> => {
    const normalized = label.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized) return null;

    // Check cache first
    const existing = globalCategories.find(c => c.value === normalized);
    if (existing) return normalized;

    // Upsert to DB
    const { error } = await supabase
      .from('downtime_categories')
      .upsert({ name: normalized, label: label.trim() }, { onConflict: 'name' });

    if (error) {
      console.error('[LookupCache] Failed to add category:', error);
      toast.error('Failed to create category');
      return null;
    }

    // Update cache instantly
    globalCategories = [...globalCategories, { value: normalized, label: label.trim() }]
      .sort((a, b) => a.label.localeCompare(b.label));
    if (!globalReasonsByCategory[normalized]) {
      globalReasonsByCategory[normalized] = [];
    }
    notifyListeners();
    toast.success('New category created');
    return normalized;
  }, []);

  // Add new reason: upsert to DB + update cache instantly
  const addReason = useCallback(async (categoryName: string, label: string): Promise<string | null> => {
    const normalized = label.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized || !categoryName) return null;

    // Check cache first
    const catReasons = globalReasonsByCategory[categoryName] || [];
    const existing = catReasons.find(r => r.value === normalized);
    if (existing) return normalized;

    // Upsert to DB
    const { error } = await supabase
      .from('downtime_reasons')
      .upsert(
        { category_name: categoryName, name: normalized, label: label.trim() },
        { onConflict: 'category_name,name' }
      );

    if (error) {
      console.error('[LookupCache] Failed to add reason:', error);
      toast.error('Failed to create reason');
      return null;
    }

    // Update cache instantly
    const updated = [...catReasons, { value: normalized, label: label.trim() }]
      .sort((a, b) => a.label.localeCompare(b.label));
    globalReasonsByCategory = { ...globalReasonsByCategory, [categoryName]: updated };
    notifyListeners();
    toast.success('New reason created');
    return normalized;
  }, []);

  const getDowntimeCategories = useCallback(() => globalCategories, []);
  const getDowntimeReasons = useCallback((category: string) => {
    return globalReasonsByCategory[category] || [];
  }, []);

  const invalidateCache = useCallback(async () => {
    globalLastFetched = null;
    globalIsLoaded = false;
    await loadLookups(true);
  }, [loadLookups]);

  return {
    lines: state.lines,
    leaders: state.leaders,
    categories: state.categories,
    reasonsByCategory: state.reasonsByCategory,
    isLoading: state.isLoading,
    isLoaded: state.isLoaded,
    loadLookups,
    addLine,
    addLeader,
    addCategory,
    addReason,
    getDowntimeCategories,
    getDowntimeReasons,
    invalidateCache,
    isCacheValid,
  };
}
