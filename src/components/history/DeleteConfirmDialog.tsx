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
import { ProductionSession } from '@/types/production';
import { useShifts } from '@/contexts/ShiftContext';
import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/exportCsv';

interface DeleteConfirmDialogProps {
  session: ProductionSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteConfirmDialog({ session, open, onOpenChange, onSuccess }: DeleteConfirmDialogProps) {
  const { deleteSession } = useShifts();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!session) return;

    setIsDeleting(true);
    try {
      const result = await deleteSession(session.id);
      if (!result.success) throw new Error(result.error);
      toast.success('Production session deleted successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete production session');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!session) return null;

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
                <p><strong>Date:</strong> {formatDate(session.date)}</p>
                <p><strong>Shift:</strong> {session.shift}</p>
                <p><strong>Line:</strong> {session.productionLine}</p>
                <p><strong>Leader:</strong> {session.lineLeader}</p>
                {session.items.length > 0 && <p><strong>SKUs:</strong> {session.items.map(i => i.sku).join(', ')}</p>}
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
