import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ProductionSession, ProductionItem, ProductionSessionFormData, ShiftType } from '@/types/production';
import { StructuredDowntime } from '@/types/downtime';
import { useAuth } from './AuthContext';
import { createPerfTimer } from '@/utils/performanceLogger';

type DbItem = Tables<'production_items'>;
type DbDowntime = Tables<'structured_downtimes'>;
type DbSession = Tables<'production_sessions'>;

interface OperationResult {
  success: boolean;
  error?: string;
}

interface ShiftContextType {
  sessions: ProductionSession[];
  isLoading: boolean;
  error: string | null;
  saveSession: (data: ProductionSessionFormData, options?: { skipRefresh?: boolean }) => Promise<OperationResult & { sessionId?: string }>;
  updateSession: (id: string, data: ProductionSessionFormData) => Promise<OperationResult>;
  deleteSession: (id: string) => Promise<OperationResult>;
  saveDowntimesBatch: (sessionId: string, downtimes: StructuredDowntime[]) => Promise<OperationResult>;
  getSessionById: (id: string) => ProductionSession | undefined;
  refreshSessions: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  hasMoreHistory: boolean;
  isLoadingMore: boolean;
  historyDaysLoaded: number;
  // Keep old names for compatibility during transition
  shifts: ProductionSession[];
  refreshShifts: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

const DEFAULT_HISTORY_DAYS = 90;
const MAX_HISTORY_DAYS = 730;
const HISTORY_INCREMENT_DAYS = 90;


function mapDbShiftType(dbType: string): ShiftType {
  const upper = dbType?.toUpperCase();
  if (upper === 'DAY') return 'DAY';
  if (upper === 'NIGHT') return 'NIGHT';
  if (upper === 'A' || upper === 'B') return 'DAY';
  if (upper === 'C') return 'NIGHT';
  return 'DAY';
}

function mapShiftTypeToDb(shift: ShiftType): string {
  return shift.toLowerCase();
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ProductionSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyDaysLoaded, setHistoryDaysLoaded] = useState(DEFAULT_HISTORY_DAYS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const hasMoreHistory = historyDaysLoaded < MAX_HISTORY_DAYS;

  const refreshSessions = useCallback(async (retryCount = 0, daysOverride?: number) => {

    if (authLoading || !user?.id) return;
    if (!isAuthenticated) {
      setSessions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Fetch sessions with 365-day lookback
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);
      let query = supabase
          .from('production_sessions')
          .select('*')
          .gte('date', cutoff.toISOString().split('T')[0])
          .order('date', { ascending: false });

      // Operators only need their own sessions
      if (user.role === 'operator' && user.name) {
        query = query.ilike('line_leader', user.name.trim());
      }

      const sessionsRes = await query;

      if (sessionsRes.error) {
        console.error('Error fetching sessions:', sessionsRes.error);
        setError('Failed to load production data.');
        setSessions([]);
        return;
      }

      if (!sessionsRes.data || sessionsRes.data.length === 0) {
        setSessions([]);
        return;
      }

      // Step 2: Fetch items & downtimes scoped to session IDs (chunked)
      const sessionIds = sessionsRes.data.map(s => s.id);
      const chunkSize = 200;
      let itemsData: DbItem[] = [];
      let downtimesData: DbDowntime[] = [];

      const chunks: string[][] = [];
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        chunks.push(sessionIds.slice(i, i + chunkSize));
      }
      const chunkResults = await Promise.all(chunks.map(chunk =>
        Promise.all([
          supabase.from('production_items').select('*').in('session_id', chunk),
          supabase.from('structured_downtimes').select('*').in('session_id', chunk),
        ])
      ));
      for (const [itemsRes, downtimesRes] of chunkResults) {
        if (itemsRes.data) itemsData = itemsData.concat(itemsRes.data);
        if (downtimesRes.data) downtimesData = downtimesData.concat(downtimesRes.data);
      }

      // Group items and downtimes by session_id
      const itemsBySession: Record<string, ProductionItem[]> = {};
      itemsData.forEach((item) => {
        if (!itemsBySession[item.session_id]) itemsBySession[item.session_id] = [];
        itemsBySession[item.session_id].push({
          id: item.id,
          sku: item.sku,
          productName: item.product_name || '',
          quantityTarget: item.quantity_target || 0,
          quantityActual: item.quantity_actual || 0,
        });
      });

      const downtimesBySession: Record<string, StructuredDowntime[]> = {};
      downtimesData.forEach((dt) => {
        if (!downtimesBySession[dt.session_id]) downtimesBySession[dt.session_id] = [];
        downtimesBySession[dt.session_id].push({
          id: dt.id,
          category: dt.category,
          reason: dt.reason,
          duration: dt.duration,
          comment: dt.comment || undefined,
        });
      });

      const mapped: ProductionSession[] = (sessionsRes.data || []).map((row: DbSession) => {
        const items = itemsBySession[row.id] || [];
        const downtimes = downtimesBySession[row.id] || [];
        const totalProduction = items.reduce((sum, i) => sum + i.quantityActual, 0);
        const totalDowntime = downtimes.reduce((sum, d) => sum + d.duration, 0);
        const plannedQty = row.planned_quantity || 0;

        return {
          id: row.id,
          productionLine: row.production_line,
          date: row.date,
          shift: mapDbShiftType(row.shift_type),
          lineLeader: row.line_leader,
          staffPlanned: row.staff_planned || 0,
          staffActual: row.staff_actual || 0,
          plannedQuantity: plannedQty,
          comments: row.comments || '',
          items,
          structuredDowntimes: downtimes,
          totalProduction,
          totalDowntime,
          performance: plannedQty > 0 ? (totalProduction / plannedQty) * 100 : 0,
          isArchived: row.is_archived,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          updatedBy: row.updated_by || undefined,
        };
      });

      setSessions(mapped);
    } catch (err) {
      console.error('Error refreshing sessions:', err);
      if (retryCount < 1) {
        console.log('Retrying session load...');
        setTimeout(() => refreshSessions(retryCount + 1), 1000);
        return;
      }
      setError('An unexpected error occurred.');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading, user?.id, user?.role, user?.name]);

  useEffect(() => {
    if (!authLoading) {
      refreshSessions();
    }
  }, [authLoading, refreshSessions]);

  // Real-time subscriptions: refetch when other users mutate shared tables
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { refreshSessions(); }, 400);
    };

    const sessionsChannel = supabase
      .channel('production-sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_sessions' }, scheduleRefresh)
      .subscribe();

    const itemsChannel = supabase
      .channel('production-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_items' }, scheduleRefresh)
      .subscribe();

    const downtimesChannel = supabase
      .channel('structured-downtimes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'structured_downtimes' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(downtimesChannel);
    };
  }, [authLoading, isAuthenticated, user?.id, refreshSessions]);


  /**
   * Save a production session: upserts session + replaces items.
   * This is the CORRECT way: 1 session per line/date/shift, N items.
   */
  const saveSession = async (data: ProductionSessionFormData, options?: { skipRefresh?: boolean }): Promise<OperationResult & { sessionId?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const timer = createPerfTimer('saveSession');


    try {
      // monitoring photo removed

      const totalProduction = data.items.reduce((sum, i) => sum + i.quantityActual, 0);
      const performance = data.plannedQuantity > 0 ? (totalProduction / data.plannedQuantity) * 100 : 0;

      // Step 1: Upsert session
      const sessionData = {
        production_line: data.productionLine.trim(),
        date: data.date,
        shift_type: mapShiftTypeToDb(data.shift),
        line_leader: data.lineLeader.trim(),
        staff_planned: data.staffPlanned || 0,
        staff_actual: data.staffActual || 0,
        planned_quantity: data.plannedQuantity,
        comments: data.comments || null,
        
        created_by: user.id,
      };

      const { data: upsertedSession, error: sessionError } = await supabase
          .from('production_sessions')
          .upsert(sessionData, { onConflict: 'production_line,date,shift_type' })
          .select('id')
          .single();

      if (sessionError) {
        console.error('Error upserting session:', sessionError);
        return { success: false, error: sessionError.message };
      }

      const sessionId = upsertedSession.id;

      // Step 2: Delete existing items for this session
      await supabase.from('production_items').delete().eq('session_id', sessionId);

      // Step 3: Batch insert new items
      if (data.items.length > 0) {
        const itemsToInsert = data.items
          .filter(i => i.sku.trim())
          .map(i => ({
            session_id: sessionId,
            sku: i.sku,
            product_name: i.productName || '',
            quantity_target: i.quantityTarget || 0,
            quantity_actual: i.quantityActual || 0,
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('production_items')
            .insert(itemsToInsert);

          if (itemsError) {
            console.error('Error inserting items:', itemsError);
            return { success: false, error: itemsError.message };
          }
        }
      }

      // Step 4: Save downtimes if provided
      if (data.structuredDowntimes && data.structuredDowntimes.length > 0) {
        // Delete existing downtimes
        await supabase.from('structured_downtimes').delete().eq('session_id', sessionId);
        
        const downtimesToInsert = data.structuredDowntimes.map(d => ({
          session_id: sessionId,
          category: d.category,
          reason: d.reason,
          duration: d.duration,
          comment: d.comment || null,
        }));

        await supabase.from('structured_downtimes').insert(downtimesToInsert);
      }

      timer.end();
      // Optimistic local insert instead of full refresh
      if (!options?.skipRefresh) {
        setSessions(prev => {
          const newSession: ProductionSession = {
            id: sessionId,
            productionLine: data.productionLine.trim(),
            date: data.date,
            shift: data.shift,
            lineLeader: data.lineLeader.trim(),
            staffPlanned: data.staffPlanned || 0,
            staffActual: data.staffActual || 0,
            plannedQuantity: data.plannedQuantity,
            comments: data.comments || '',
            items: data.items.map((i, idx) => ({ id: `temp-${idx}`, ...i })),
            structuredDowntimes: data.structuredDowntimes || [],
            totalProduction,
            totalDowntime: (data.structuredDowntimes || []).reduce((sum, d) => sum + d.duration, 0),
            performance,
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [newSession, ...prev.filter(s => s.id !== sessionId)];
        });
      }
      return { success: true, sessionId };
    } catch (error) {
      console.error('Error saving session:', error);
      timer.end();
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updateSession = async (id: string, data: ProductionSessionFormData): Promise<OperationResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const timer = createPerfTimer('updateSession');

    try {
      // === OPERATOR PATH: only update quantity_actual on existing items ===
      if (user.role === 'operator') {
        const updatePromises = (data.items || [])
          .filter(item => (item as unknown as { id?: string }).id)
          .map(item =>
            supabase
              .from('production_items')
              .update({ quantity_actual: item.quantityActual || 0 })
              .eq('id', (item as unknown as { id: string }).id)
              .eq('session_id', id)
              .select('id')
          );

        if (updatePromises.length > 0) {
          const results = await Promise.all(updatePromises);
          let failedCount = 0;
          for (const res of results) {
            if (res.error) {
              console.error('Error updating item:', res.error);
              timer.end();
              return { success: false, error: res.error.message };
            }
            if (!res.data || res.data.length === 0) {
              failedCount++;
            }
          }
          if (failedCount > 0) {
            console.error(`${failedCount} item(s) not updated — RLS policy likely blocked the operation`);
            timer.end();
            return { success: false, error: 'Não foi possível salvar. Seu perfil pode estar incompleto — tente sair e entrar novamente.' };
          }
        }

        // Handle downtimes for operator
        if (data.structuredDowntimes) {
          await supabase.from('structured_downtimes').delete().eq('session_id', id);
          if (data.structuredDowntimes.length > 0) {
            await supabase.from('structured_downtimes').insert(
              data.structuredDowntimes.map(dt => ({
                session_id: id,
                category: dt.category,
                reason: dt.reason,
                duration: dt.duration,
                comment: dt.comment || null,
              }))
            );
          }
        }

        // Optimistic local update for operator
        const updatedDowntimes = data.structuredDowntimes || [];
        setSessions(prev => prev.map(s => {
          if (s.id !== id) return s;
          const updatedItems = s.items.map(existingItem => {
            const match = data.items.find(i => (i as unknown as { id?: string }).id === existingItem.id);
            return match ? { ...existingItem, quantityActual: match.quantityActual } : existingItem;
          });
          const totalProduction = updatedItems.reduce((sum, i) => sum + i.quantityActual, 0);
          const totalDowntime = updatedDowntimes.reduce((sum, d) => sum + d.duration, 0);
          const performance = s.plannedQuantity > 0 ? (totalProduction / s.plannedQuantity) * 100 : 0;
          return { ...s, items: updatedItems, structuredDowntimes: updatedDowntimes, totalProduction, totalDowntime, performance };
        }));

        timer.end();
        return { success: true };
      }

      // === SUPERVISOR/ADMIN PATH: full update ===

      // Step 1: Update session record
      const { error: sessionError } = await supabase
        .from('production_sessions')
        .update({
          production_line: data.productionLine.trim(),
          date: data.date,
          shift_type: mapShiftTypeToDb(data.shift),
          line_leader: data.lineLeader.trim(),
          staff_planned: data.staffPlanned || 0,
          staff_actual: data.staffActual || 0,
          planned_quantity: data.plannedQuantity,
          comments: data.comments || null,
          updated_by: user?.name || null,
          updated_at: new Date().toISOString(),
          
        })
        .eq('id', id);

      if (sessionError) {
        console.error('Error updating session:', sessionError);
        return { success: false, error: sessionError.message };
      }

      // Step 2: Delete old items and downtimes in PARALLEL
      const [deleteItemsRes, deleteDowntimesRes] = await Promise.all([
        supabase.from('production_items').delete().eq('session_id', id),
        supabase.from('structured_downtimes').delete().eq('session_id', id),
      ]);

      if (deleteItemsRes.error) {
        console.error('Error deleting old items:', deleteItemsRes.error);
        return { success: false, error: deleteItemsRes.error.message };
      }
      if (deleteDowntimesRes.error) {
        console.error('Error deleting old downtimes:', deleteDowntimesRes.error);
        return { success: false, error: deleteDowntimesRes.error.message };
      }

      // Step 3: Insert new items and downtimes in PARALLEL
      const itemsToInsert = data.items
        .filter(i => i.sku.trim())
        .map(i => ({
          session_id: id,
          sku: i.sku,
          product_name: i.productName || '',
          quantity_target: i.quantityTarget || 0,
          quantity_actual: i.quantityActual || 0,
        }));

      const downtimesToInsert = (data.structuredDowntimes || []).map(d => ({
        session_id: id,
        category: d.category,
        reason: d.reason,
        duration: d.duration,
        comment: d.comment || null,
      }));

      const insertPromises = [];
      if (itemsToInsert.length > 0) {
        insertPromises.push(Promise.resolve(supabase.from('production_items').insert(itemsToInsert).select()));
      }
      if (downtimesToInsert.length > 0) {
        insertPromises.push(Promise.resolve(supabase.from('structured_downtimes').insert(downtimesToInsert).select()));
      }

      if (insertPromises.length > 0) {
        const insertResults = await Promise.all(insertPromises);
        for (const res of insertResults) {
          if (res.error) {
            console.error('Error inserting data:', res.error);
            return { success: false, error: res.error.message };
          }
        }
      }

      // Step 4: Optimistic local state update
      const totalProduction = data.items.reduce((sum, i) => sum + i.quantityActual, 0);
      const totalDowntime = (data.structuredDowntimes || []).reduce((sum, d) => sum + d.duration, 0);
      const performance = data.plannedQuantity > 0 ? (totalProduction / data.plannedQuantity) * 100 : 0;

      setSessions(prev => prev.map(s => s.id === id ? {
        ...s,
        productionLine: data.productionLine.trim(),
        date: data.date,
        shift: data.shift,
        lineLeader: data.lineLeader.trim(),
        staffPlanned: data.staffPlanned || 0,
        staffActual: data.staffActual || 0,
        plannedQuantity: data.plannedQuantity,
        comments: data.comments || '',
        
        items: data.items.map((i, idx) => ({ id: `temp-${idx}`, ...i })),
        structuredDowntimes: data.structuredDowntimes || [],
        totalProduction,
        totalDowntime,
        performance,
      } : s));

      timer.end();
      return { success: true };
    } catch (error) {
      console.error('Error updating session:', error);
      timer.end();
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deleteSession = async (id: string): Promise<OperationResult> => {
    try {
      const { error } = await supabase.from('production_sessions').delete().eq('id', id);
      if (error) {
        console.error('Error deleting session:', error);
        return { success: false, error: error.message };
      }
      setSessions(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const saveDowntimesBatch = async (
    sessionId: string,
    downtimes: StructuredDowntime[]
  ): Promise<OperationResult> => {
    const timer = createPerfTimer('saveDowntimesBatch');
    try {
      await supabase.from('structured_downtimes').delete().eq('session_id', sessionId);

      if (downtimes.length > 0) {
        const toInsert = downtimes.map(d => ({
          session_id: sessionId,
          category: d.category,
          reason: d.reason,
          duration: d.duration,
          comment: d.comment || null,
        }));

        const { error: insertError } = await supabase.from('structured_downtimes').insert(toInsert);

        if (insertError) {
          console.error('Error inserting downtimes:', insertError);
          return { success: false, error: insertError.message };
        }
      }

      // Optimistic local update
      const totalDowntime = downtimes.reduce((sum, d) => sum + d.duration, 0);
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, structuredDowntimes: downtimes, totalDowntime }
          : s
      ));

      timer.end();
      return { success: true };
    } catch (error) {
      console.error('Error saving downtimes batch:', error);
      timer.end();
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getSessionById = (id: string) => sessions.find(s => s.id === id);

  return (
    <ShiftContext.Provider value={{
      sessions,
      isLoading,
      error,
      saveSession,
      updateSession,
      deleteSession,
      saveDowntimesBatch,
      getSessionById,
      refreshSessions,
      // Backward compat aliases
      shifts: sessions,
      refreshShifts: refreshSessions,
    }}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShifts() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShifts must be used within a ShiftProvider');
  }
  return context;
}
