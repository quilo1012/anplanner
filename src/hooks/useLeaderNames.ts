import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderName {
  id: string;
  name: string;
}

/** Fetches leader (operator role) names for the tablet's "Requested By"
 * dropdown, via the secure list_leader_names() RPC. */
export function useLeaderNames() {
  const [leaders, setLeaders] = useState<LeaderName[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('list_leader_names' as never).then(({ data }) => {
      setLeaders((data || []) as unknown as LeaderName[]);
      setIsLoading(false);
    });
  }, []);

  return { leaders, isLoading };
}
