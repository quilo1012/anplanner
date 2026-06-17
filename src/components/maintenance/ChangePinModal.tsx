import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { verifyEngineerPin, setEngineerPin } from '@/hooks/useEngineerPin';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

interface ChangePinModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'current' | 'new' | 'done';

/**
 * Self-service "change my PIN" flow for the shared maintenance login.
 * Step 1: verify the engineer's current PIN (this is how the system knows
 * WHO is changing their PIN, since there's no individual login).
 * Step 2: enter and confirm a new 4-6 digit PIN.
 */
export function ChangePinModal({ open, onClose }: ChangePinModalProps) {
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [engineerId, setEngineerId] = useState('');
  const [engineerName, setEngineerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('current');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setEngineerId('');
    setEngineerName('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleVerifyCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await verifyEngineerPin(currentPin);
    setIsSubmitting(false);
    if (!result.success || !result.engineerId || !result.engineerName) {
      setError(result.error || 'Incorrect PIN.');
      setCurrentPin('');
      return;
    }
    setEngineerId(result.engineerId);
    setEngineerName(result.engineerName);
    setStep('new');
  };

  const handleSetNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    setIsSubmitting(true);
    const result = await setEngineerPin(engineerId, newPin);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Failed to update PIN.');
      return;
    }
    setStep('done');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound size={18} /> Change My PIN</DialogTitle>
        </DialogHeader>

        {step === 'current' && (
          <form onSubmit={handleVerifyCurrent} className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter your current PIN to continue.</p>
            <input
              type="password" inputMode="numeric" autoFocus
              value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              className="input-field text-center text-2xl tracking-widest" placeholder="••••" maxLength={6}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || currentPin.length < 4}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Continue
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 'new' && (
          <form onSubmit={handleSetNew} className="space-y-3">
            <p className="text-sm text-muted-foreground">Hi {engineerName}, choose a new PIN (4–6 digits).</p>
            <input
              type="password" inputMode="numeric" autoFocus
              value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="input-field text-center text-2xl tracking-widest" placeholder="New PIN" maxLength={6}
            />
            <input
              type="password" inputMode="numeric"
              value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="input-field text-center text-2xl tracking-widest" placeholder="Confirm PIN" maxLength={6}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || newPin.length < 4 || confirmPin.length < 4}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Save New PIN
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-3 text-center py-2">
            <CheckCircle2 size={32} className="text-success mx-auto" />
            <p className="text-sm text-foreground">PIN updated for {engineerName}.</p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
