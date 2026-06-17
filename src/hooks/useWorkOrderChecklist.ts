import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  problem_description_id: string;
  type: string;
  description: string;
  is_required: boolean;
}

export interface ChecklistResponse {
  id: string;
  checklist_id: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
}

interface OperationResult {
  success: boolean;
  error?: string;
}

/**
 * Fetches the checklist items that apply to a work order, based on its
 * `description` matching a `problem_descriptions.name` exactly (same
 * matching approach Anmaisys used), plus any existing responses for this
 * specific work order.
 */
export function useWorkOrderChecklist(workOrderId: string | undefined, problemName: string | undefined) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [responses, setResponses] = useState<ChecklistResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChecklist = useCallback(async () => {
    if (!workOrderId || !problemName) {
      setItems([]);
      setResponses([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data: problem } = await supabase
        .from('problem_descriptions' as never)
        .select('id')
        .eq('name', problemName)
        .maybeSingle();

      const problemId = (problem as unknown as { id: string } | null)?.id;
      if (!problemId) {
        setItems([]);
        setResponses([]);
        return;
      }

      const { data: checklistItems } = await supabase
        .from('checklists' as never)
        .select('id, problem_description_id, type, description, is_required')
        .eq('problem_description_id', problemId)
        .order('type', { ascending: true });

      const { data: existingResponses } = await supabase
        .from('checklist_responses' as never)
        .select('id, checklist_id, completed, completed_by, completed_at')
        .eq('work_order_id', workOrderId);

      setItems((checklistItems || []) as unknown as ChecklistItem[]);
      setResponses((existingResponses || []) as unknown as ChecklistResponse[]);
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId, problemName]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const toggleItem = async (checklistId: string, completed: boolean, _userId: string | undefined): Promise<OperationResult> => {
    if (!workOrderId) return { success: false, error: 'Missing work order id' };
    try {
      const existing = responses.find(r => r.checklist_id === checklistId);
      if (existing) {
        const { error } = await supabase
          .from('checklist_responses' as never)
          .update({ completed, completed_by: null, completed_at: completed ? new Date().toISOString() : null } as never)
          .eq('id', existing.id);
        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase
          .from('checklist_responses' as never)
          .insert({ work_order_id: workOrderId, checklist_id: checklistId, completed, completed_by: null, completed_at: completed ? new Date().toISOString() : null } as never);
        if (error) return { success: false, error: error.message };
      }
      await fetchChecklist();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const allRequiredComplete = items
    .filter(i => i.is_required)
    .every(i => responses.find(r => r.checklist_id === i.id)?.completed);

  return { items, responses, isLoading, toggleItem, allRequiredComplete, refreshChecklist: fetchChecklist };
}
