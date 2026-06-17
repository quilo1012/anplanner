import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'anplanner_device_token';

export interface PairedLine {
  id: string;
  name: string;
  display_order: number;
}

/** Manages this specific browser/tablet's pairing: the device_token is kept
 * in localStorage (not tied to any user login), and once paired, fetches
 * which lines this tablet covers. */
export function useDevicePairing() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [pairedLines, setPairedLines] = useState<PairedLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPairedLines([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    supabase
      .rpc('lines_for_device_token' as never, { _token: token } as never)
      .then(({ data, error: rpcError }) => {
        setIsLoading(false);
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setPairedLines((data || []) as unknown as PairedLine[]);
      });
  }, [token]);

  const pair = async (candidateToken: string): Promise<{ success: boolean; error?: string }> => {
    const normalized = candidateToken.trim().toUpperCase();
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('lines_for_device_token' as never, { _token: normalized } as never);
    if (rpcError) return { success: false, error: rpcError.message };
    const lines = (data || []) as unknown as PairedLine[];
    if (lines.length === 0) {
      return { success: false, error: 'Pairing code not found, or no lines assigned to it yet. Check with your admin.' };
    }
    localStorage.setItem(STORAGE_KEY, normalized);
    setToken(normalized);
    setPairedLines(lines);
    return { success: true };
  };

  const unpair = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setPairedLines([]);
  };

  return { token, pairedLines, isLoading, error, isPaired: !!token, pair, unpair };
}
