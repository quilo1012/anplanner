import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShiftReport, ShiftFormData, StructuredDowntime, ShiftType } from '@/types/shift';
import { useAuth } from './AuthContext';

interface ShiftOperationResult {
  success: boolean;
  error?: string;
}

interface ShiftContextType {
  shifts: ShiftReport[];
  isLoading: boolean;
  error: string | null;
  addShift: (data: ShiftFormData) => Promise<ShiftOperationResult>;
  updateShift: (id: string, data: ShiftFormData) => Promise<ShiftOperationResult>;
  deleteShift: (id: string) => Promise<ShiftOperationResult>;
  getShiftById: (id: string) => ShiftReport | undefined;
  refreshShifts: () => Promise<void>;
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
        .select('*')
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
        .select('*');

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

      // Create signed URL (valid for 1 hour) - bucket is now private for security
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('monitoring-photos')
        .createSignedUrl(data.path, 3600);

      if (urlError || !signedUrlData) {
        console.error('Error creating signed URL:', urlError);
        // Store the path so we can regenerate signed URLs later
        return data.path;
      }

      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('Error processing photo:', error);
      return null;
    }
  };

  const addShift = async (data: ShiftFormData): Promise<ShiftOperationResult> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const performance = calculatePerformance(data.realProduction, data.productionTarget);

      // Upload photo if exists
      let photoUrl: string | null = null;
      if (data.monitoringPhoto && data.photoFilename) {
        photoUrl = await uploadPhoto(data.monitoringPhoto, data.photoFilename);
      }

      // Insert shift
      const { data: newShift, error: shiftError } = await supabase
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
        .single();

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

      await refreshShifts();
      return { success: true };
    } catch (error) {
      console.error('Error adding shift:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updateShift = async (id: string, data: ShiftFormData): Promise<ShiftOperationResult> => {
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

      // Update shift
      const { error: shiftError } = await supabase
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
        .eq('id', id);

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

      await refreshShifts();
      return { success: true };
    } catch (error) {
      console.error('Error updating shift:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deleteShift = async (id: string): Promise<ShiftOperationResult> => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting shift:', error);
        return { success: false, error: error.message };
      }

      await refreshShifts();
      return { success: true };
    } catch (error) {
      console.error('Error deleting shift:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getShiftById = (id: string) => {
    return shifts.find(shift => shift.id === id);
  };

  return (
    <ShiftContext.Provider value={{ shifts, isLoading, error, addShift, updateShift, deleteShift, getShiftById, refreshShifts }}>
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
