import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductionSession, ShiftType, SHIFT_TYPES } from '@/types/production';
import { StructuredDowntime } from '@/types/downtime';
import { SkuRow } from '@/types/planner';
import { useShifts } from '@/contexts/ShiftContext';
import { PhotoUpload } from '@/components/PhotoUpload';
import { SkuRowForm } from '@/components/SkuRowForm';
import { StructuredDowntimeForm } from '@/components/StructuredDowntimeForm';
import { Loader2, Save, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditShiftDialogProps {
  session: ProductionSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isOperator?: boolean;
}

export function EditShiftDialog({ session, open, onOpenChange, onSuccess, isOperator = false }: EditShiftDialogProps) {
  const { updateSession } = useShifts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [date, setDate] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('DAY');
  const [productionLine, setProductionLine] = useState('');
  const [lineLeader, setLineLeader] = useState('');
  const [staffPlanned, setStaffPlanned] = useState(0);
  const [staffActual, setStaffActual] = useState(0);
  const [observations, setObservations] = useState('');
  const [lineTarget, setLineTarget] = useState(0);
  const [skuRows, setSkuRows] = useState<SkuRow[]>([]);
  const [monitoringPhoto, setMonitoringPhoto] = useState<string | undefined>();
  const [photoFilename, setPhotoFilename] = useState<string | undefined>();
  const [structuredDowntimes, setStructuredDowntimes] = useState<StructuredDowntime[]>([]);

  const { totalProduction, performance } = useMemo(() => {
    const total = skuRows.reduce((sum, row) => sum + (row.realProduction || 0), 0);
    const perf = lineTarget > 0 ? (total / lineTarget) * 100 : 0;
    return { totalProduction: total, performance: perf };
  }, [skuRows, lineTarget]);

  // Initialize form state when session changes (moved from render body to useEffect)
  useEffect(() => {
    if (!session) return;
    setDate(session.date);
    setShiftType(session.shift);
    setProductionLine(session.productionLine);
    setLineLeader(session.lineLeader);
    setStaffPlanned(session.staffPlanned);
    setStaffActual(session.staffActual);
    setObservations(session.comments);
    setMonitoringPhoto(session.monitoringPhoto);
    setPhotoFilename(session.photoFilename);
    setStructuredDowntimes(session.structuredDowntimes || []);
    setLineTarget(session.plannedQuantity);
    setSkuRows(session.items.map(item => ({
      id: item.id, sku: item.sku, product: item.productName,
      productionTarget: item.quantityTarget, realProduction: item.quantityActual, isFoundInDb: true,
    })));
  }, [session?.id]);

  const handlePhotoChange = (photo: string | undefined, filename: string | undefined) => {
    setMonitoringPhoto(photo);
    setPhotoFilename(filename);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const validRows = skuRows.filter(row => row.sku.trim());
    if (validRows.length === 0) { toast.error('At least one SKU is required'); return; }
    if (!isOperator && lineTarget <= 0) { toast.error('Line Production Target is required'); return; }

    setIsSubmitting(true);
    try {
      // Operator path: only send item IDs + quantity_actual
      if (isOperator) {
        const result = await updateSession(session.id, {
          date: session.date,
          shift: session.shift,
          productionLine: session.productionLine,
          lineLeader: session.lineLeader,
          plannedQuantity: session.plannedQuantity,
          items: validRows.map(row => ({
            id: row.id,
            sku: row.sku,
            productName: row.product,
            quantityTarget: row.productionTarget || 0,
            quantityActual: row.realProduction || 0,
          } as any)),
          comments: session.comments,
          staffPlanned: session.staffPlanned,
          staffActual: session.staffActual,
          structuredDowntimes,
        });

        if (!result.success) {
          toast.error(`Failed to update: ${result.error}`);
          return;
        }

        toast.success('Production updated successfully');
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      // Supervisor/Admin path: full update
      // Batch save new products to catalog
      const newProductRows = skuRows.filter(r => r.isNewProduct && r.sku.trim() && r.product.trim());
      if (newProductRows.length > 0) {
        const { data: existingProducts } = await supabase
          .from('products')
          .select('product_code')
          .in('product_code', newProductRows.map(r => r.sku));
        const existingCodes = new Set((existingProducts || []).map(p => p.product_code));
        const toInsert = newProductRows.filter(r => !existingCodes.has(r.sku));
        if (toInsert.length > 0) {
          const { error } = await supabase.from('products').insert(
            toInsert.map(r => ({ product_code: r.sku, product_description: r.product }))
          );
          if (!error) toast.success(`${toInsert.length} new product(s) saved to catalog`);
        }
      }

      const result = await updateSession(session.id, {
        date, shift: shiftType, productionLine: productionLine.trim(), lineLeader: lineLeader.trim(),
        plannedQuantity: lineTarget,
        items: validRows.map(row => ({
          sku: row.sku, productName: row.product,
          quantityTarget: row.productionTarget || 0,
          quantityActual: row.realProduction || 0,
        })),
        comments: observations,
        structuredDowntimes,
        monitoringPhoto, photoFilename,
        staffPlanned, staffActual,
      });

      if (!result.success) {
        toast.error(`Failed to update: ${result.error}`);
        return;
      }

      toast.success('Session updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Production Session</DialogTitle>
          <DialogDescription>Update the production session for {session.productionLine} - {session.date}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isOperator && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Shift</Label>
              <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFT_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Production Line</Label><Input value={productionLine} onChange={(e) => setProductionLine(e.target.value)} required className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Leader</Label><Input value={lineLeader} onChange={(e) => setLineLeader(e.target.value)} required className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Staff Planned</Label><Input type="number" min={0} value={staffPlanned} onChange={(e) => setStaffPlanned(parseInt(e.target.value) || 0)} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Staff Actual</Label><Input type="number" min={0} value={staffActual} onChange={(e) => setStaffActual(parseInt(e.target.value) || 0)} className="h-9" /></div>
          </div>
          )}

          {!isOperator && (
          <div className="border-t pt-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Label className="text-sm flex items-center gap-2 font-medium"><Target size={16} className="text-primary" />Line Production Target</Label>
              <div className="relative max-w-xs mt-1">
                <Input type="number" value={lineTarget || ''} onChange={(e) => setLineTarget(parseInt(e.target.value) || 0)} min={0} className="h-10 pr-14 text-lg font-semibold" required />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">units</span>
              </div>
            </div>
          </div>
          )}

          <div className="border-t pt-4">
            <SkuRowForm skuRows={skuRows} onChange={setSkuRows} canReview={!isOperator} errors={{}} showTarget={false} />
          </div>

          <div className="p-4 bg-muted rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Total Production</div>
                  <div className="text-xl font-bold flex items-center gap-2"><TrendingUp size={18} className="text-primary" />{totalProduction.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">units</span></div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="text-lg font-semibold">{lineTarget.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">units</span></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Performance</div>
                <div className={`text-2xl font-bold ${performance >= 100 ? 'text-green-600' : performance >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{performance.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {!isOperator && (
          <>
          <div className="space-y-1 border-t pt-4">
            <Label className="text-xs">Comments / Observations</Label>
            <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>

          <div className="space-y-2 border-t pt-4">
            <h4 className="font-medium text-sm text-foreground">Monitoring Photo</h4>
            <PhotoUpload photo={monitoringPhoto} filename={photoFilename} onChange={handlePhotoChange} />
          </div>

          </>
          )}

          <div className="space-y-2 border-t pt-4">
            <StructuredDowntimeForm downtimes={structuredDowntimes} onChange={setStructuredDowntimes} downtimeThreshold={60} />
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Changes</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
