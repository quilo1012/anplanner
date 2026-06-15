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
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/exportCsv';

interface Props {
  sessions: ProductionSession[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (deletedIds: string[]) => void;
}

export function BulkDeleteConfirmDialog({ sessions, open, onOpenChange, onComplete }: Props) {
  const { deleteSession } = useShifts();
  const { hasRole } = useAuth();
  const canDelete = hasRole(['supervisor', 'admin']);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("You don't have permission to delete shifts. Supervisor or Admin role required.");
      onOpenChange(false);
      return;
    }
    if (sessions.length === 0) return;
    setIsDeleting(true);

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const s of sessions) {
      try {
        const res = await deleteSession(s.id);
        if (res.success) deleted.push(s.id);
        else failed.push({ id: s.id, error: res.error || 'Unknown error' });
      } catch (err: any) {
        failed.push({ id: s.id, error: err?.message || 'Unknown error' });
      }
    }
    setIsDeleting(false);
    if (failed.length === 0) {
      toast.success(`${deleted.length} deleted successfully`);
    } else if (deleted.length === 0) {
      toast.error(`Failed to delete ${failed.length} session(s)`);
    } else {
      toast.warning(`Deleted ${deleted.length}, but ${failed.length} failed`);
    }
    onComplete?.(deleted);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {sessions.length} Shift Record(s)
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Are you sure you want to delete the following {sessions.length} shift(s)? This action cannot be undone.</p>
              <div className="bg-muted p-3 rounded-lg text-sm max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-1 pr-2">Line</th>
                      <th className="py-1 pr-2">Date</th>
                      <th className="py-1 pr-2">Shift</th>
                      <th className="py-1">Leader</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} className="border-b border-border/40">
                        <td className="py-1 pr-2 font-medium">{s.productionLine}</td>
                        <td className="py-1 pr-2">{formatDate(s.date)}</td>
                        <td className="py-1 pr-2">{s.shift}</td>
                        <td className="py-1">{s.lineLeader}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            {isDeleting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>) : `Delete ${sessions.length} Record(s)`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
