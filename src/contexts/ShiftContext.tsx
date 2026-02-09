import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShiftReport, ShiftFormData, StructuredDowntime, ShiftType } from '@/types/shift';
import { useAuth } from './AuthContext';
import { createPerfTimer } from '@/utils/performanceLogger';

interface ShiftOperationResult {
  success: boolean;
  error?: string;
}

interface ShiftContextType {
  shifts: ShiftReport[];
  isLoading: boolean;
  error: string | null;
  addShift: (data: ShiftFormData, skipRefresh?: boolean) => Promise<ShiftOperationResult>;
  addShiftsBatch: (shifts: ShiftFormData[]) => Promise<ShiftOperationResult>;
  updateShift: (id: string, data: ShiftFormData, skipRefresh?: boolean) => Promise<ShiftOperationResult>;
  deleteShift: (id: string, skipRefresh?: boolean) => Promise<ShiftOperationResult>;
  saveDowntimesBatch: (shiftId: string, downtimes: StructuredDowntime[]) => Promise<ShiftOperationResult>;
  getShiftById: (id: string) => ShiftReport | undefined;
  refreshShifts: () => Promise<void>;
  // Optimistic update helpers
  addShiftLocally: (shift: ShiftReport) => void;
  updateShiftLocally: (id: string, data: Partial<ShiftReport>) => void;
  removeShiftLocally: (id: string) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

function calculatePerformance(real: number, target: number): number {
  if (target <= 0) return 0;
  return (real / target) * 100;
}

function calculateTotalDowntime(structuredDowntimes?: StructuredDowntime[]): number {
  return structuredDowntimes?.reduce((total, d) => total + d.duration, 0) || 0;
}

// Map database shift_type to ShiftType (DAY/NIGHT)
function mapDbShiftType(dbType: string): ShiftType {
  const upper = dbType?.toUpperCase();
  if (upper === 'DAY') return 'DAY';
  if (upper === 'NIGHT') return 'NIGHT';
  // Legacy mapping from A/B/C
  if (upper === 'A' || upper === 'B') return 'DAY';
  if (upper === 'C') return 'NIGHT';
  return 'DAY';
}

// Map ShiftType to database shift_type
function mapShiftTypeToDb(shift: ShiftType): string {
  return shift.toLowerCase();
}

// Map database row to ShiftReport
function mapDbToShift(row: any, downtimes: any[]): ShiftReport {
  const shiftDowntimes = downtimes.filter(d => d.shift_id === row.id);
  const structuredDowntimes: StructuredDowntime[] = shiftDowntimes.map(d => ({
    id: d.id,
    category: d.category,
    reason: d.reason,
    duration: d.duration,
    comment: d.comment || undefined,
  }));

  return {
    id: row.id,
    date: row.date,
    shift: mapDbShiftType(row.shift_type),
    productionLine: row.production_line,
    lineLeader: row.line_leader,
    product: row.product_name,
    sku: row.sku || '',
    productionTarget: row.planned_quantity,
    realProduction: row.real_production,
    performance: Number(row.performance),
    observations: row.comments || '',
    downtimes: [], // Legacy field, kept empty
    structuredDowntimes,
    totalDowntime: calculateTotalDowntime(structuredDowntimes),
    monitoringPhoto: row.monitoring_photo_url || undefined,
    photoFilename: row.monitoring_photo_url ? row.monitoring_photo_url.split('/').pop() : undefined,
    staffPlanned: row.staff_planned || 0,
    staffActual: row.staff_actual || 0,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Timeout wrapper to prevent infinite hangs
async function withTimeout<T>(
  queryBuilder: PromiseLike<T>,
  timeoutMs: number = 10000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
  );
  return Promise.race([Promise.resolve(queryBuilder), timeout]);
}

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useState<ShiftReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const refreshShifts = useCallback(async () => {
    // Don't fetch if auth is still loading or user not authenticated
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setShifts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, date, shift_type, production_line, line_leader, product_name, sku, planned_quantity, real_production, performance, comments, is_archived, monitoring_photo_url, staff_planned, staff_actual, created_by, created_at, updated_at')
        .order('date', { ascending: false });

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        setError('Failed to load shifts. Please try again.');
        setShifts([]);
        return;
      }

      // Fetch all downtimes
      const { data: downtimesData, error: downtimesError } = await supabase
        .from('structured_downtimes')
        .select('id, shift_id, category, reason, duration, comment, created_at');

      if (downtimesError) {
        console.error('Error fetching downtimes:', downtimesError);
        // Non-critical - continue with shifts
      }

      const mappedShifts = (shiftsData || []).map(row => 
        mapDbToShift(row, downtimesData || [])
      );

      setShifts(mappedShifts);
    } catch (err) {
      console.error('Error refreshing shifts:', err);
      setError('An unexpected error occurred. Please reload the page.');
      setShifts([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Load shifts only when auth is resolved and user is authenticated
  useEffect(() => {
    if (!authLoading) {
      refreshShifts();
    }
  }, [authLoading, refreshShifts]);

  // Optimistic update: add shift locally
  const addShiftLocally = useCallback((shift: ShiftReport) => {
    setShifts(prev => [shift, ...prev]);
  }, []);

  // Optimistic update: update shift locally
  const updateShiftLocally = useCallback((id: string, data: Partial<ShiftReport>) => {
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  // Optimistic update: remove shift locally
  const removeShiftLocally = useCallback((id: string) => {
    setShifts(prev => prev.filter(s => s.id !== id));
  }, []);

  /**
   * Sanitizes filename for Supabase Storage compatibility.
   * Removes accents, spaces and special characters.
   */
  const sanitizeFilename = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot > 0 ? filename.slice(lastDot) : '';
    
    const safeName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase()
      .slice(0, 100);
    
    return safeName + ext.toLowerCase();
  };

  const uploadPhoto = async (base64Photo: string, filename: string): Promise<string | null> => {
    try {
      // Convert base64 to blob
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
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading photo:', error);
        return null;
      }

      // Return just the path - signed URL will be generated when displaying
      return data.path;
    } catch (error) {
      console.error('Error processing photo:', error);
      return null;
    }
  };

  const addShift = async (data: ShiftFormData, skipRefresh = false): Promise<ShiftOperationResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    const timer = createPerfTimer('addShift');

    try {
      const performance = calculatePerformance(data.realProduction, data.productionTarget);

      // Upload photo if exists
      let photoUrl: string | null = null;
      if (data.monitoringPhoto && data.photoFilename) {
        photoUrl = await uploadPhoto(data.monitoringPhoto, data.photoFilename);
      }

      // Insert shift with timeout protection
      const { data: newShift, error: shiftError } = await withTimeout(
        supabase
          .from('shifts')
          .insert({
            date: data.date,
            shift_type: mapShiftTypeToDb(data.shift),
            production_line: data.productionLine,
            line_leader: data.lineLeader,
            product_name: data.product,
            sku: data.sku || null,
            planned_quantity: data.productionTarget,
            real_production: data.realProduction,
            performance: performance,
            comments: data.observations || null,
            is_archived: false,
            monitoring_photo_url: photoUrl,
            staff_planned: data.staffPlanned || 0,
            staff_actual: data.staffActual || 0,
            created_by: user.id,
          })
          .select()
          .single(),
        10000
      );

      if (shiftError) {
        console.error('Error adding shift:', shiftError);
        return { success: false, error: shiftError.message };
      }

      // Insert structured downtimes
      if (data.structuredDowntimes && data.structuredDowntimes.length > 0) {
        const downtimesToInsert = data.structuredDowntimes.map(d => ({
          shift_id: newShift.id,
          category: d.category,
          reason: d.reason,
          duration: d.duration,
          comment: d.comment || null,
        }));

        const { error: downtimeError } = await supabase
          .from('structured_downtimes')
          .insert(downtimesToInsert);

        if (downtimeError) {
          console.error('Error adding downtimes:', downtimeError);
          // Non-critical, shift was saved
        }
      }

      // Only refresh if not skipped
      if (!skipRefresh) {
        await refreshShifts();
      }
      timer.end();
      return { success: true };
    } catch (error) {
      console.error('Error adding shift:', error);
      timer.end();
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Batch insert multiple shifts in a single operation
  const addShiftsBatch = async (shiftsData: ShiftFormData[]): Promise<ShiftOperationResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    if (shiftsData.length === 0) return { success: true };
    const timer = createPerfTimer(`addShiftsBatch(${shiftsData.length})`);

    try {
      // Prepare all shift data (photos are handled separately if needed)
      const shiftsToInsert = shiftsData.map(data => ({
        date: data.date,
        shift_type: mapShiftTypeToDb(data.shift),
        production_line: data.productionLine,
        line_leader: data.lineLeader,
        product_name: data.product,
        sku: data.sku || null,
        planned_quantity: data.productionTarget,
        real_production: data.realProduction,
        performance: calculatePerformance(data.realProduction, data.productionTarget),
        comments: data.observations || null,
        is_archived: false,
        monitoring_photo_url: null, // Photos not supported in batch mode
        staff_planned: data.staffPlanned || 0,
        staff_actual: data.staffActual || 0,
        created_by: user.id,
      }));

      // Single batch insert with timeout
      const { data: newShifts, error: batchError } = await withTimeout(
        supabase
          .from('shifts')
          .insert(shiftsToInsert)
          .select(),
        15000
      );

      if (batchError) {
        console.error('Error batch inserting shifts:', batchError);
        return { success: false, error: batchError.message };
      }

      if (!newShifts || newShifts.length === 0) {
        return { success: false, error: 'No shifts were inserted' };
      }

      // Batch insert all downtimes
      const allDowntimes: Array<{
        shift_id: string;
        category: string;
        reason: string;
        duration: number;
        comment: string | null;
      }> = [];

      shiftsData.forEach((shiftData, idx) => {
        if (shiftData.structuredDowntimes && shiftData.structuredDowntimes.length > 0 && newShifts[idx]) {
          shiftData.structuredDowntimes.forEach(d => {
            allDowntimes.push({
              shift_id: newShifts[idx].id,
              category: d.category,
              reason: d.reason,
              duration: d.duration,
              comment: d.comment || null,
            });
          });
        }
      });

      if (allDowntimes.length > 0) {
        const { error: downtimeError } = await supabase
          .from('structured_downtimes')
          .insert(allDowntimes);

        if (downtimeError) {
          console.error('Error batch inserting downtimes:', downtimeError);
          // Non-critical, shifts were saved
        }
      }

      // Single refresh at the end
      await refreshShifts();
      timer.end();
      return { success: true };
    } catch (error) {
      console.error('Error in batch shift insert:', error);
      timer.end();
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updateShift = async (id: string, data: ShiftFormData, skipRefresh = false): Promise<ShiftOperationResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const performance = calculatePerformance(data.realProduction, data.productionTarget);

      // Upload new photo if exists and is base64
      let photoUrl: string | undefined = undefined;
      if (data.monitoringPhoto && data.monitoringPhoto.startsWith('data:')) {
        const uploadedUrl = await uploadPhoto(data.monitoringPhoto, data.photoFilename || 'photo.jpg');
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      // Update shift with timeout
      const { error: shiftError } = await withTimeout(
        supabase
          .from('shifts')
          .update({
            date: data.date,
            shift_type: mapShiftTypeToDb(data.shift),
            production_line: data.productionLine,
            line_leader: data.lineLeader,
            product_name: data.product,
            sku: data.sku || null,
            planned_quantity: data.productionTarget,
            real_production: data.realProduction,
            performance: performance,
            comments: data.observations || null,
            staff_planned: data.staffPlanned || 0,
            staff_actual: data.staffActual || 0,
            ...(photoUrl && { monitoring_photo_url: photoUrl }),
          })
          .eq('id', id),
        10000
      );

      if (shiftError) {
        console.error('Error updating shift:', shiftError);
        return { success: false, error: shiftError.message };
      }

      // Delete existing downtimes and insert new ones
      await supabase
        .from('structured_downtimes')
        .delete()
        .eq('shift_id', id);

      if (data.structuredDowntimes && data.structuredDowntimes.length > 0) {
        const downtimesToInsert = data.structuredDowntimes.map(d => ({
          shift_id: id,
          category: d.category,
          reason: d.reason,
          duration: d.duration,
          comment: d.comment || null,
        }));

        const { error: downtimeError } = await supabase
          .from('structured_downtimes')
          .insert(downtimesToInsert);

        if (downtimeError) {
          console.error('Error updating downtimes:', downtimeError);
        }
      }

      // Only refresh if not skipped
      if (!skipRefresh) {
        await refreshShifts();
      }
      return { success: true };
    } catch (error) {
      console.error('Error updating shift:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deleteShift = async (id: string, skipRefresh = false): Promise<ShiftOperationResult> => {
    try {
      const { error } = await withTimeout(
        supabase
          .from('shifts')
          .delete()
          .eq('id', id),
        10000
      );

      if (error) {
        console.error('Error deleting shift:', error);
        return { success: false, error: error.message };
      }

      // Only refresh if not skipped
      if (!skipRefresh) {
        await refreshShifts();
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting shift:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getShiftById = (id: string) => {
    return shifts.find(shift => shift.id === id);
  };

  /**
   * Batch save downtimes for a shift - NO refresh, optimistic local update only.
   * Designed for < 500ms save time as per industrial requirements.
   */
  const saveDowntimesBatch = async (
    shiftId: string,
    downtimes: StructuredDowntime[]
  ): Promise<ShiftOperationResult> => {
    try {
      // Delete existing downtimes for this shift
      const { error: deleteError } = await withTimeout(
        supabase
          .from('structured_downtimes')
          .delete()
          .eq('shift_id', shiftId),
        5000
      );

      if (deleteError) {
        console.error('Error deleting old downtimes:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // Insert new downtimes in batch
      if (downtimes.length > 0) {
        const downtimesToInsert = downtimes.map(d => ({
          shift_id: shiftId,
          category: d.category,
          reason: d.reason,
          duration: d.duration,
          comment: d.comment || null,
        }));

        const { error: insertError } = await withTimeout(
          supabase
            .from('structured_downtimes')
            .insert(downtimesToInsert),
          5000
        );

        if (insertError) {
          console.error('Error inserting downtimes:', insertError);
          return { success: false, error: insertError.message };
        }
      }

      // Optimistic local update - NO refreshShifts() call
      const totalDowntime = downtimes.reduce((sum, d) => sum + d.duration, 0);
      updateShiftLocally(shiftId, {
        structuredDowntimes: downtimes,
        totalDowntime,
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving downtimes batch:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return (
    <ShiftContext.Provider value={{ 
      shifts, 
      isLoading, 
      error, 
      addShift, 
      addShiftsBatch,
      updateShift, 
      deleteShift,
      saveDowntimesBatch,
      getShiftById, 
      refreshShifts,
      addShiftLocally,
      updateShiftLocally,
      removeShiftLocally,
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
