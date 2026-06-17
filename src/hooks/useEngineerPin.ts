import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export interface PinVerifyResult {
  success: boolean;
  engineerId?: string;
  engineerName?: string;
  error?: string;
}

interface OperationResult {
  success: boolean;
  error?: string;
}

/**
 * Verifies a PIN against the engineers table via the secure
 * verify_pin_by_code() RPC (server-side bcrypt comparison; the hash never
 * reaches the client). Returns the matching engineer if the PIN is correct.
 */
export async function verifyEngineerPin(pin: string): Promise<PinVerifyResult> {
  if (!pin || pin.trim().length === 0) {
    return { success: false, error: 'Please enter a PIN.' };
  }
  try {
    const { data, error } = await supabase.rpc('verify_pin_by_code' as never, { _pin: pin.trim() } as never);
    if (error) return { success: false, error: error.message };
    const rows = (data || []) as unknown as { engineer_id: string; engineer_name: string }[];
    if (rows.length === 0) {
      return { success: false, error: 'Incorrect PIN. Please try again.' };
    }
    return { success: true, engineerId: rows[0].engineer_id, engineerName: rows[0].engineer_name };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Changes an engineer's PIN via the secure set_engineer_pin() RPC. Caller is
 * expected to have already verified the engineer's *current* PIN before
 * calling this (the UI enforces "verify old PIN, then set new PIN").
 */
export async function setEngineerPin(engineerId: string, newPin: string): Promise<OperationResult> {
  if (!/^\d{4,6}$/.test(newPin)) {
    return { success: false, error: 'PIN must be 4 to 6 digits.' };
  }
  try {
    const { error } = await supabase.rpc('set_engineer_pin' as never, { _engineer_id: engineerId, _new_pin: newPin } as never);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
