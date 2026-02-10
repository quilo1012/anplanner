import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductionSession, ProductionItem, ProductionSessionFormData, ShiftType } from '@/types/production';
import { StructuredDowntime } from '@/types/downtime';
import { useAuth } from './AuthContext';
import { createPerfTimer } from '@/utils/performanceLogger';

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
  // Keep old names for compatibility during transition
  shifts: ProductionSession[];
  refreshShifts: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const refreshSessions = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSessions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Parallel fetch with 15s timeout
      const [sessionsRes, itemsRes, downtimesRes] = await withTimeout(
        Promise.all([
          supabase
            .from('production_sessions')
            .select('*')
            .order('date', { ascending: false }),
          supabase
            .from('production_items')
            .select('*'),
          supabase
            .from('structured_downtimes')
            .select('*'),
        ]),
        15000
      );

      if (sessionsRes.error) {
        console.error('Error fetching sessions:', sessionsRes.error);
        setError('Failed to load production data.');
        setSessions([]);
        return;
      }

      const itemsData = itemsRes.data || [];
      const downtimesData = downtimesRes.data || [];

      // Group items and downtimes by session_id
      const itemsBySession: Record<string, ProductionItem[]> = {};
      itemsData.forEach((item: any) => {
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
      downtimesData.forEach((dt: any) => {
        if (!downtimesBySession[dt.session_id]) downtimesBySession[dt.session_id] = [];
        downtimesBySession[dt.session_id].push({
          id: dt.id,
          category: dt.category,
          reason: dt.reason,
          duration: dt.duration,
          comment: dt.comment || undefined,
        });
      });

      const mapped: ProductionSession[] = (sessionsRes.data || []).map((row: any) => {
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
          monitoringPhoto: row.monitoring_photo_url || undefined,
          photoFilename: row.monitoring_photo_url ? row.monitoring_photo_url.split('/').pop() : undefined,
          items,
          structuredDowntimes: downtimes,
          totalProduction,
          totalDowntime,
          performance: plannedQty > 0 ? (totalProduction / plannedQty) * 100 : 0,
          isArchived: row.is_archived,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      setSessions(mapped);
    } catch (err) {
      console.error('Error refreshing sessions:', err);
      setError('An unexpected error occurred.');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      refreshSessions();
    }
  }, [authLoading, refreshSessions]);

  const sanitizeFilename = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot > 0 ? filename.slice(lastDot) : '';
    const safeName = name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_').replace(/^_|_$/g, '')
      .toLowerCase().slice(0, 100);
    return safeName + ext.toLowerCase();
  };

  const uploadPhoto = async (base64Photo: string, filename: string): Promise<string | null> => {
    try {
      const base64Data = base64Photo.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const safeName = sanitizeFilename(filename);
      const filePath = `${Date.now()}-${safeName}`;

      const { data, error } = await supabase.storage
        .from('monitoring-photos')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });

      if (error) { console.error('Error uploading photo:', error); return null; }
      return data.path;
    } catch (error) { console.error('Error processing photo:', error); return null; }
  };

  /**
   * Save a production session: upserts session + replaces items.
   * This is the CORRECT way: 1 session per line/date/shift, N items.
   */
  const saveSession = async (data: ProductionSessionFormData): Promise<OperationResult & { sessionId?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const timer = createPerfTimer('saveSession');

    try {
      // Upload photo if base64
      let photoUrl: string | null = null;
      if (data.monitoringPhoto && data.monitoringPhoto.startsWith('data:')) {
        photoUrl = await uploadPhoto(data.monitoringPhoto, data.photoFilename || 'photo.jpg');
      } else if (data.monitoringPhoto) {
        photoUrl = data.monitoringPhoto; // Already a path
      }

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
        monitoring_photo_url: photoUrl,
        created_by: user.id,
      };

      const { data: upsertedSession, error: sessionError } = await withTimeout(
        supabase
          .from('production_sessions')
          .upsert(sessionData, { onConflict: 'production_line,date,shift_type' })
          .select('id')
          .single(),
        10000
      );

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
      refreshSessions().catch(err => console.error('Background refresh failed:', err));
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
      let photoUrl: string | undefined = undefined;
      if (data.monitoringPhoto && data.monitoringPhoto.startsWith('data:')) {
        const uploaded = await uploadPhoto(data.monitoringPhoto, data.photoFilename || 'photo.jpg');
        if (uploaded) photoUrl = uploaded;
      }

      // Update session
      const { error: sessionError } = await withTimeout(
        supabase
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
            ...(photoUrl && { monitoring_photo_url: photoUrl }),
          })
          .eq('id', id),
        10000
      );

      if (sessionError) {
        console.error('Error updating session:', sessionError);
        return { success: false, error: sessionError.message };
      }

      // Replace items
      const { error: deleteItemsError } = await withTimeout(
        supabase.from('production_items').delete().eq('session_id', id),
        10000
      );
      if (deleteItemsError) {
        console.error('Error deleting old items:', deleteItemsError);
        return { success: false, error: deleteItemsError.message };
      }

      if (data.items.length > 0) {
        const itemsToInsert = data.items
          .filter(i => i.sku.trim())
          .map(i => ({
            session_id: id,
            sku: i.sku,
            product_name: i.productName || '',
            quantity_target: i.quantityTarget || 0,
            quantity_actual: i.quantityActual || 0,
          }));

        if (itemsToInsert.length > 0) {
          const { error: insertItemsError } = await withTimeout(
            supabase.from('production_items').insert(itemsToInsert),
            10000
          );
          if (insertItemsError) {
            console.error('Error inserting items:', insertItemsError);
            return { success: false, error: insertItemsError.message };
          }
        }
      }

      // Replace downtimes
      const { error: deleteDowntimesError } = await withTimeout(
        supabase.from('structured_downtimes').delete().eq('session_id', id),
        10000
      );
      if (deleteDowntimesError) {
        console.error('Error deleting old downtimes:', deleteDowntimesError);
        return { success: false, error: deleteDowntimesError.message };
      }

      if (data.structuredDowntimes && data.structuredDowntimes.length > 0) {
        const downtimesToInsert = data.structuredDowntimes.map(d => ({
          session_id: id,
          category: d.category,
          reason: d.reason,
          duration: d.duration,
          comment: d.comment || null,
        }));
        const { error: insertDowntimesError } = await withTimeout(
          supabase.from('structured_downtimes').insert(downtimesToInsert),
          10000
        );
        if (insertDowntimesError) {
          console.error('Error inserting downtimes:', insertDowntimesError);
          return { success: false, error: insertDowntimesError.message };
        }
      }

      timer.end();
      refreshSessions().catch(err => console.error('Background refresh failed:', err));
      return { success: true };
    } catch (error) {
      console.error('Error updating session:', error);
      timer.end();
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deleteSession = async (id: string): Promise<OperationResult> => {
    try {
      const { error } = await withTimeout(
        supabase.from('production_sessions').delete().eq('id', id),
        10000
      );
      if (error) {
        console.error('Error deleting session:', error);
        return { success: false, error: error.message };
      }
      refreshSessions().catch(err => console.error('Background refresh failed:', err));
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
      await withTimeout(
        supabase.from('structured_downtimes').delete().eq('session_id', sessionId),
        5000
      );

      if (downtimes.length > 0) {
        const toInsert = downtimes.map(d => ({
          session_id: sessionId,
          category: d.category,
          reason: d.reason,
          duration: d.duration,
          comment: d.comment || null,
        }));

        const { error: insertError } = await withTimeout(
          supabase.from('structured_downtimes').insert(toInsert),
          5000
        );

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
