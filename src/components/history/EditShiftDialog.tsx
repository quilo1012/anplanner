import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ShiftReport, ShiftType, SHIFT_TYPES } from '@/types/shift';
import { useShifts } from '@/contexts/ShiftContext';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EditShiftDialogProps {
  shift: ShiftReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditShiftDialog({ shift, open, onOpenChange, onSuccess }: EditShiftDialogProps) {
  const { updateShift } = useShifts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [date, setDate] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('DAY');
  const [productionLine, setProductionLine] = useState('');
  const [lineLeader, setLineLeader] = useState('');
  const [product, setProduct] = useState('');
  const [sku, setSku] = useState('');
  const [productionTarget, setProductionTarget] = useState(0);
  const [realProduction, setRealProduction] = useState(0);
  const [staffPlanned, setStaffPlanned] = useState(0);
  const [staffActual, setStaffActual] = useState(0);
  const [observations, setObservations] = useState('');

  // Reset form when shift changes
  useEffect(() => {
    if (shift) {
      setDate(shift.date);
      setShiftType(shift.shift);
      setProductionLine(shift.productionLine);
      setLineLeader(shift.lineLeader);
      setProduct(shift.product);
      setSku(shift.sku);
      setProductionTarget(shift.productionTarget);
      setRealProduction(shift.realProduction);
      setStaffPlanned(shift.staffPlanned);
      setStaffActual(shift.staffActual);
      setObservations(shift.observations);
    }
  }, [shift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;

    setIsSubmitting(true);
    try {
      await updateShift(shift.id, {
        date,
        shift: shiftType,
        productionLine,
        lineLeader,
        product,
        sku,
        productionTarget,
        realProduction,
        observations,
        downtimes: shift.downtimes,
        structuredDowntimes: shift.structuredDowntimes,
        monitoringPhoto: shift.monitoringPhoto,
        photoFilename: shift.photoFilename,
        staffPlanned,
        staffActual,
      });

      toast.success('Shift updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shift Record</DialogTitle>
          <DialogDescription>
            Update the production record details. All linked SKUs and downtimes will be preserved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Shift */}
            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
              <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Production Line */}
            <div className="space-y-2">
              <Label htmlFor="line">Production Line</Label>
              <Input
                id="line"
                value={productionLine}
                onChange={(e) => setProductionLine(e.target.value)}
                placeholder="e.g., Line 1"
                required
              />
            </div>

            {/* Leader */}
            <div className="space-y-2">
              <Label htmlFor="leader">Leader / Supervisor</Label>
              <Input
                id="leader"
                value={lineLeader}
                onChange={(e) => setLineLeader(e.target.value)}
                placeholder="Leader name"
                required
              />
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Product SKU"
              />
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="product">Product Name</Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Product name"
              />
            </div>

            {/* Production Target */}
            <div className="space-y-2">
              <Label htmlFor="target">Planned Quantity</Label>
              <Input
                id="target"
                type="number"
                min={0}
                value={productionTarget}
                onChange={(e) => setProductionTarget(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Real Production */}
            <div className="space-y-2">
              <Label htmlFor="actual">Actual Quantity</Label>
              <Input
                id="actual"
                type="number"
                min={0}
                value={realProduction}
                onChange={(e) => setRealProduction(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Staff Planned */}
            <div className="space-y-2">
              <Label htmlFor="staffPlanned">Staff Planned</Label>
              <Input
                id="staffPlanned"
                type="number"
                min={0}
                value={staffPlanned}
                onChange={(e) => setStaffPlanned(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Staff Actual */}
            <div className="space-y-2">
              <Label htmlFor="staffActual">Staff Actual</Label>
              <Input
                id="staffActual"
                type="number"
                min={0}
                value={staffActual}
                onChange={(e) => setStaffActual(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations">Comments / Observations</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
