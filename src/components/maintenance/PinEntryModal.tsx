import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { verifyEngineerPin } from '@/hooks/useEngineerPin';
import { Loader2, KeyRound } from 'lucide-react';

interface PinEntryModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onVerified: (engineerId: string, engineerName: string) => void;
}

/**
 * Modal that confirms WHICH engineer is performing an action (accept,
 * finish) on a shared maintenance login. Verifies the entered PIN
 * server-side via verify_pin_by_code() — never compares locally.
 */
export function PinEntryModal({ open, title, description, onClose, onVerified }: PinEntryModalProps) {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);
    const result = await verifyEngineerPin(pin);
    setIsVerifying(false);
    if (!result.success || !result.engineerId || !result.engineerName) {
      setError(result.error || 'Incorrect PIN. Please try again.');
      setPin('');
      return;
    }
    onVerified(result.engineerId, result.engineerName);
    setPin('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound size={18} /> {title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="input-field text-center text-2xl tracking-widest"
            placeholder="••••"
            maxLength={6}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isVerifying}>Cancel</Button>
            <Button type="submit" disabled={isVerifying || pin.length < 4}>
              {isVerifying ? <Loader2 size={16} className="animate-spin" /> : null} Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
