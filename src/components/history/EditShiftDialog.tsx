import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ShiftReport, ShiftType, SHIFT_TYPES, StructuredDowntime } from '@/types/shift';
import { SkuRow } from '@/types/planner';
import { useShifts } from '@/contexts/ShiftContext';
import { PhotoUpload } from '@/components/PhotoUpload';
import { SkuRowForm } from '@/components/SkuRowForm';
import { StructuredDowntimeForm } from '@/components/StructuredDowntimeForm';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditShiftDialogProps {
  shift: ShiftReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditShiftDialog({ shift, open, onOpenChange, onSuccess }: EditShiftDialogProps) {
  const { updateShift, addShift } = useShifts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [date, setDate] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('DAY');
  const [productionLine, setProductionLine] = useState('');
  const [lineLeader, setLineLeader] = useState('');
  const [staffPlanned, setStaffPlanned] = useState(0);
  const [staffActual, setStaffActual] = useState(0);
  const [observations, setObservations] = useState('');
  
  // SKU Rows state - now supports multiple SKUs
  const [skuRows, setSkuRows] = useState<SkuRow[]>([]);
  
  // Photo and Downtime state
  const [monitoringPhoto, setMonitoringPhoto] = useState<string | undefined>();
  const [photoFilename, setPhotoFilename] = useState<string | undefined>();
  const [structuredDowntimes, setStructuredDowntimes] = useState<StructuredDowntime[]>([]);

  // Reset form when shift changes
  useEffect(() => {
    if (shift) {
      setDate(shift.date);
      setShiftType(shift.shift);
      setProductionLine(shift.productionLine);
      setLineLeader(shift.lineLeader);
      setStaffPlanned(shift.staffPlanned);
      setStaffActual(shift.staffActual);
      setObservations(shift.observations);
      setMonitoringPhoto(shift.monitoringPhoto);
      setPhotoFilename(shift.photoFilename);
      setStructuredDowntimes(shift.structuredDowntimes || []);
      
      // Convert existing shift to SkuRow format
      setSkuRows([{
        id: shift.id,
        sku: shift.sku,
        product: shift.product,
        productionTarget: shift.productionTarget,
        realProduction: shift.realProduction,
        isFoundInDb: true,
      }]);
    }
  }, [shift]);

  const handlePhotoChange = (photo: string | undefined, filename: string | undefined) => {
    setMonitoringPhoto(photo);
    setPhotoFilename(filename);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;

    // Validate at least one SKU
    const validRows = skuRows.filter(row => row.sku.trim());
    if (validRows.length === 0) {
      toast.error('At least one SKU is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save new products to catalog if flagged
      for (const row of skuRows) {
        if (row.isNewProduct && row.sku.trim() && row.product.trim()) {
          const { data: existing } = await supabase
            .from('products')
            .select('product_code')
            .eq('product_code', row.sku)
            .maybeSingle();
          
          if (!existing) {
            const { error } = await supabase.from('products').insert({
              product_code: row.sku,
              product_description: row.product,
            });
            
            if (error) {
              console.error('Error saving new product:', error);
            } else {
              toast.success(`Product ${row.sku} saved to catalog`);
            }
          }
        }
      }

      // First row updates the original shift
      const firstRow = validRows[0];
      const result = await updateShift(shift.id, {
        date,
        shift: shiftType,
        productionLine,
        lineLeader,
        product: firstRow.product,
        sku: firstRow.sku,
        productionTarget: firstRow.productionTarget,
        realProduction: firstRow.realProduction,
        observations,
        downtimes: shift.downtimes,
        structuredDowntimes,
        monitoringPhoto,
        photoFilename,
        staffPlanned,
        staffActual,
      });

      if (result && !result.success) {
        toast.error(`Failed to update: ${result.error || 'Unknown error'}`);
        return;
      }

      // Additional rows create new shifts
      if (validRows.length > 1) {
        for (let i = 1; i < validRows.length; i++) {
          const row = validRows[i];
          const addResult = await addShift({
            date,
            shift: shiftType,
            productionLine,
            lineLeader,
            product: row.product,
            sku: row.sku,
            productionTarget: row.productionTarget,
            realProduction: row.realProduction,
            observations,
            downtimes: [],
            structuredDowntimes: [],
            monitoringPhoto,
            photoFilename,
            staffPlanned,
            staffActual,
          });

          if (!addResult.success) {
            toast.error(`Failed to add SKU ${row.sku}: ${addResult.error}`);
          }
        }
        toast.success(`Updated shift and added ${validRows.length - 1} new record(s)`);
      } else {
        toast.success('Shift updated successfully');
      }

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

  const hasMultipleRows = skuRows.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shift Record</DialogTitle>
          <DialogDescription>
            Update the production record details. You can add multiple SKUs - additional SKUs will create new records.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9"
              />
            </div>

            {/* Shift */}
            <div className="space-y-1">
              <Label htmlFor="shift" className="text-xs">Shift</Label>
              <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
                <SelectTrigger className="h-9">
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
            <div className="space-y-1">
              <Label htmlFor="line" className="text-xs">Production Line</Label>
              <Input
                id="line"
                value={productionLine}
                onChange={(e) => setProductionLine(e.target.value)}
                placeholder="e.g., Line 1"
                required
                className="h-9"
              />
            </div>

            {/* Leader */}
            <div className="space-y-1">
              <Label htmlFor="leader" className="text-xs">Leader / Supervisor</Label>
              <Input
                id="leader"
                value={lineLeader}
                onChange={(e) => setLineLeader(e.target.value)}
                placeholder="Leader name"
                required
                className="h-9"
              />
            </div>

            {/* Staff Planned */}
            <div className="space-y-1">
              <Label htmlFor="staffPlanned" className="text-xs">Staff Planned</Label>
              <Input
                id="staffPlanned"
                type="number"
                min={0}
                value={staffPlanned}
                onChange={(e) => setStaffPlanned(parseInt(e.target.value) || 0)}
                className="h-9"
              />
            </div>

            {/* Staff Actual */}
            <div className="space-y-1">
              <Label htmlFor="staffActual" className="text-xs">Staff Actual</Label>
              <Input
                id="staffActual"
                type="number"
                min={0}
                value={staffActual}
                onChange={(e) => setStaffActual(parseInt(e.target.value) || 0)}
                className="h-9"
              />
            </div>
          </div>

          {/* SKU Rows Section */}
          <div className="border-t pt-4">
            {hasMultipleRows && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-warning/10 border border-warning/30 rounded-md text-sm">
                <AlertTriangle size={16} className="text-warning" />
                <span>Adding multiple SKUs will create {skuRows.length - 1} new shift record(s)</span>
              </div>
            )}
            <SkuRowForm
              skuRows={skuRows}
              onChange={setSkuRows}
              canReview={true}
              errors={{}}
            />
          </div>

          {/* Observations */}
          <div className="space-y-1 border-t pt-4">
            <Label htmlFor="observations" className="text-xs">Comments / Observations</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Monitoring Photo Section */}
          <div className="space-y-2 border-t pt-4">
            <h4 className="font-medium text-sm text-foreground">Monitoring Photo</h4>
            <PhotoUpload
              photo={monitoringPhoto}
              filename={photoFilename}
              onChange={handlePhotoChange}
            />
          </div>

          {/* Downtime Section */}
          <div className="space-y-2 border-t pt-4">
            <StructuredDowntimeForm
              downtimes={structuredDowntimes}
              onChange={setStructuredDowntimes}
              downtimeThreshold={60}
            />
          </div>

          <DialogFooter className="pt-4 gap-2">
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
                  {hasMultipleRows ? `Save ${skuRows.length} Record(s)` : 'Save Changes'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
