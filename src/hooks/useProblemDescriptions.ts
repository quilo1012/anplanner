import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProblemDescription {
  id: string;
  name: string;
  category: string | null;
}

/** Fetches the catalog of standard problem descriptions used when raising a
 * work order (e.g. "Filler jam", "Capper misfeed"), grouped by category. */
export function useProblemDescriptions() {
  const [problems, setProblems] = useState<ProblemDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('problem_descriptions' as never)
      .select('id, name, category')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => {
        setProblems((data || []) as unknown as ProblemDescription[]);
        setIsLoading(false);
      });
  }, []);

  return { problems, isLoading };
}
