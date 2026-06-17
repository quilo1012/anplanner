import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export interface Device {
  id: string;
  device_token: string;
  label: string | null;
  line_ids: string[];
  last_seen_at: string | null;
  created_at: string;
}

interface OperationResult {
  success: boolean;
  error?: string;
}

/** Generates a short, easy-to-type pairing code (e.g. "FX7K-2QPL"). */
export function generateDeviceToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}

/** Manages tablet devices paired to one or more production lines, used to
 * scope the Line dropdown on a fixed shop-floor tablet's "Open Work Order"
 * screen. Mirrors Anmaisys's devices/device_lines model. */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [devicesRes, deviceLinesRes] = await Promise.all([
        supabase.from('devices' as never).select('id, device_token, label, last_seen_at, created_at').order('created_at', { ascending: false }),
        supabase.from('device_lines' as never).select('device_id, line_id'),
      ]);
      if (devicesRes.error) throw devicesRes.error;
      const deviceLines = (deviceLinesRes.data || []) as unknown as { device_id: string; line_id: string }[];
      const rows = (devicesRes.data || []) as unknown as Omit<Device, 'line_ids'>[];
      setDevices(rows.map(d => ({ ...d, line_ids: deviceLines.filter(dl => dl.device_id === d.id).map(dl => dl.line_id) })));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const createDevice = async (label: string): Promise<{ success: boolean; error?: string; token?: string }> => {
    const token = generateDeviceToken();
    try {
      const { error: insertError } = await supabase
        .from('devices' as never)
        .insert({ device_token: token, label, paired_at: new Date().toISOString() } as never);
      if (insertError) return { success: false, error: insertError.message };
      await fetchDevices();
      return { success: true, token };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const setDeviceLines = async (deviceId: string, lineIds: string[]): Promise<OperationResult> => {
    try {
      const { error: deleteError } = await supabase.from('device_lines' as never).delete().eq('device_id', deviceId);
      if (deleteError) return { success: false, error: deleteError.message };
      if (lineIds.length > 0) {
        const { error: insertError } = await supabase
          .from('device_lines' as never)
          .insert(lineIds.map(line_id => ({ device_id: deviceId, line_id })) as never);
        if (insertError) return { success: false, error: insertError.message };
      }
      await fetchDevices();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const deleteDevice = async (deviceId: string): Promise<OperationResult> => {
    try {
      const { error: deleteError } = await supabase.from('devices' as never).delete().eq('id', deviceId);
      if (deleteError) return { success: false, error: deleteError.message };
      await fetchDevices();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  return { devices, isLoading, error, refreshDevices: fetchDevices, createDevice, setDeviceLines, deleteDevice };
}
