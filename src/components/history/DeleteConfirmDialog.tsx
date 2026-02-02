import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShiftReport } from '@/types/shift';
import { useShifts } from '@/contexts/ShiftContext';
import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/exportCsv';

interface DeleteConfirmDialogProps {
  shift: ShiftReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteConfirmDialog({ shift, open, onOpenChange, onSuccess }: DeleteConfirmDialogProps) {
  const { deleteShift } = useShifts();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!shift) return;

    setIsDeleting(true);
    try {
      await deleteShift(shift.id);
      toast.success('Shift record deleted successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Failed to delete shift record');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!shift) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Shift Record
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete this shift record? This action cannot be undone.
              </p>
              
              <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                <p><strong>Date:</strong> {formatDate(shift.date)}</p>
                <p><strong>Shift:</strong> {shift.shift}</p>
                <p><strong>Line:</strong> {shift.productionLine}</p>
                <p><strong>Leader:</strong> {shift.lineLeader}</p>
                {shift.sku && <p><strong>SKU:</strong> {shift.sku}</p>}
              </div>

              <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg text-sm text-destructive">
                <strong>Warning:</strong> This will permanently delete:
                <ul className="list-disc list-inside mt-1">
                  <li>The production header record</li>
                  <li>All associated SKU entries</li>
                  <li>All downtime records linked to this shift</li>
                  <li>Supervisor report quantities</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete Record'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
