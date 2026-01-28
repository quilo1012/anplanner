import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShiftReport, ShiftFormData, StructuredDowntime } from '@/types/shift';
import { useAuth } from './AuthContext';

interface ShiftContextType {
  shifts: ShiftReport[];
  isLoading: boolean;
  addShift: (data: ShiftFormData) => Promise<void>;
  updateShift: (id: string, data: ShiftFormData) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
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
    shift: row.shift_type === 'day' ? 'Day' : 'Night',
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
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useState<ShiftReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  const refreshShifts = useCallback(async () => {
    if (!isAuthenticated) {
      setShifts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false });

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        return;
      }

      // Fetch all downtimes
      const { data: downtimesData, error: downtimesError } = await supabase
        .from('structured_downtimes')
        .select('*');

      if (downtimesError) {
        console.error('Error fetching downtimes:', downtimesError);
      }

      const mappedShifts = (shiftsData || []).map(row => 
        mapDbToShift(row, downtimesData || [])
      );

      setShifts(mappedShifts);
    } catch (error) {
      console.error('Error refreshing shifts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load shifts when authenticated
  useEffect(() => {
    refreshShifts();
  }, [refreshShifts]);

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

      const filePath = `${Date.now()}-${filename}`;

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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('monitoring-photos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error processing photo:', error);
      return null;
    }
  };

  const addShift = async (data: ShiftFormData) => {
    if (!user) return;

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
          shift_type: data.shift === 'Day' ? 'day' : 'night',
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
          created_by: user.id,
        })
        .select()
        .single();

      if (shiftError) {
        console.error('Error adding shift:', shiftError);
        return;
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
        }
      }

      await refreshShifts();
    } catch (error) {
      console.error('Error adding shift:', error);
    }
  };

  const updateShift = async (id: string, data: ShiftFormData) => {
    if (!user) return;

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
          shift_type: data.shift === 'Day' ? 'day' : 'night',
          production_line: data.productionLine,
          line_leader: data.lineLeader,
          product_name: data.product,
          sku: data.sku || null,
          planned_quantity: data.productionTarget,
          real_production: data.realProduction,
          performance: performance,
          comments: data.observations || null,
          ...(photoUrl && { monitoring_photo_url: photoUrl }),
        })
        .eq('id', id);

      if (shiftError) {
        console.error('Error updating shift:', shiftError);
        return;
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
    } catch (error) {
      console.error('Error updating shift:', error);
    }
  };

  const deleteShift = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting shift:', error);
        return;
      }

      await refreshShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const getShiftById = (id: string) => {
    return shifts.find(shift => shift.id === id);
  };

  return (
    <ShiftContext.Provider value={{ shifts, isLoading, addShift, updateShift, deleteShift, getShiftById, refreshShifts }}>
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
