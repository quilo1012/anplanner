import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DOWNTIME_CATEGORIES, DOWNTIME_REASONS_BY_CATEGORY, DowntimeCategory } from '@/types/downtime';

interface LookupCacheState {
  lines: string[];
  leaders: string[];
  isLoading: boolean;
  isLoaded: boolean;
  lastFetched: Date | null;
}

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Singleton cache shared across all hook instances
let globalLines: string[] = [];
let globalLeaders: string[] = [];
let globalLastFetched: Date | null = null;
let globalIsLoading = false;
let globalIsLoaded = false;
let loadPromise: Promise<void> | null = null;

export function useLookupCache() {
  const [state, setState] = useState<LookupCacheState>({
    lines: globalLines,
    leaders: globalLeaders,
    isLoading: globalIsLoading,
    isLoaded: globalIsLoaded,
    lastFetched: globalLastFetched,
  });

  const isCacheValid = useCallback(() => {
    if (!globalLastFetched || !globalIsLoaded) return false;
    const age = Date.now() - globalLastFetched.getTime();
    return age < CACHE_DURATION_MS;
  }, []);

  const loadLookups = useCallback(async (force = false) => {
    // If cache is valid and not forcing, skip
    if (!force && isCacheValid()) {
      return;
    }

    // If already loading, wait for existing promise
    if (loadPromise) {
      await loadPromise;
      setState({
        lines: globalLines,
        leaders: globalLeaders,
        isLoading: false,
        isLoaded: globalIsLoaded,
        lastFetched: globalLastFetched,
      });
      return;
    }

    globalIsLoading = true;
    setState(prev => ({ ...prev, isLoading: true }));

    loadPromise = (async () => {
      try {
        // Fetch unique production lines and leaders from shifts
        const { data: shiftsData, error } = await supabase
          .from('shifts')
          .select('production_line, line_leader');

        if (error) {
          console.error('[LookupCache] Error loading lookups:', error);
          return;
        }

        // Extract unique values
        const linesSet = new Set<string>();
        const leadersSet = new Set<string>();

        (shiftsData || []).forEach(s => {
          if (s.production_line) linesSet.add(s.production_line);
          if (s.line_leader) leadersSet.add(s.line_leader);
        });

        globalLines = Array.from(linesSet).sort();
        globalLeaders = Array.from(leadersSet).sort();
        globalLastFetched = new Date();
        globalIsLoaded = true;

        console.log(`[LookupCache] Loaded ${globalLines.length} lines, ${globalLeaders.length} leaders`);
      } catch (err) {
        console.error('[LookupCache] Failed to load:', err);
      } finally {
        globalIsLoading = false;
        loadPromise = null;
      }
    })();

    await loadPromise;

    setState({
      lines: globalLines,
      leaders: globalLeaders,
      isLoading: false,
      isLoaded: globalIsLoaded,
      lastFetched: globalLastFetched,
    });
  }, [isCacheValid]);

  // Add new line to cache (when new line is used)
  const addLine = useCallback((line: string) => {
    if (!globalLines.includes(line)) {
      globalLines = [...globalLines, line].sort();
      setState(prev => ({ ...prev, lines: globalLines }));
    }
  }, []);

  // Add new leader to cache (when new leader is used)
  const addLeader = useCallback((leader: string) => {
    if (!globalLeaders.includes(leader)) {
      globalLeaders = [...globalLeaders, leader].sort();
      setState(prev => ({ ...prev, leaders: globalLeaders }));
    }
  }, []);

  // Get downtime categories (static data)
  const getDowntimeCategories = useCallback(() => {
    return DOWNTIME_CATEGORIES;
  }, []);

  // Get downtime reasons for category (static data)
  const getDowntimeReasons = useCallback((category: DowntimeCategory) => {
    return DOWNTIME_REASONS_BY_CATEGORY[category] || [];
  }, []);

  // Invalidate and reload cache
  const invalidateCache = useCallback(async () => {
    globalLastFetched = null;
    globalIsLoaded = false;
    await loadLookups(true);
  }, [loadLookups]);

  return {
    lines: state.lines,
    leaders: state.leaders,
    isLoading: state.isLoading,
    isLoaded: state.isLoaded,
    loadLookups,
    addLine,
    addLeader,
    getDowntimeCategories,
    getDowntimeReasons,
    invalidateCache,
    isCacheValid,
  };
}
