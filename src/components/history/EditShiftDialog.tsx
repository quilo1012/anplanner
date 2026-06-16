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

import { SkuRowForm } from '@/components/SkuRowForm';
import { StructuredDowntimeForm } from '@/components/StructuredDowntimeForm';
import { Loader2, Save, Target, TrendingUp, Wrench, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QualityActionsForm } from '@/components/QualityActionsForm';
import { QualityActionRow } from '@/types/quality';
import { saveQualityActionsForSession, fetchQualityActionsForSessions } from '@/utils/qualityActions';
import { useAuth } from '@/contexts/AuthContext';
import { mapToAnmaisysLine } from '@/utils/maintenanceLineMapping';
import { createMaintenanceOrder } from '@/services/maintenanceBridge';
import { DOWNTIME_REASONS_FALLBACK } from '@/types/downtime';

interface EditShiftDialogProps {
  session: ProductionSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  isOperator?: boolean;
}

export function EditShiftDialog({ session, open, onOpenChange, onSuccess, isOperator = false }: EditShiftDialogProps) {
  const { updateSession } = useShifts();
  const { user } = useAuth();
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
  const [structuredDowntimes, setStructuredDowntimes] = useState<StructuredDowntime[]>([]);
  const [qualityRows, setQualityRows] = useState<QualityActionRow[]>([]);
  const [creatingOrderId, setCreatingOrderId] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<Record<string, number>>({});

  const maintenanceDowntimes = useMemo(
    () => structuredDowntimes.filter(dt => dt.category === 'maintenance'),
    [structuredDowntimes]
  );

  const reasonLabel = (value: string) => {
    const found = DOWNTIME_REASONS_FALLBACK.maintenance?.find(r => r.value === value);
    return found?.label ?? value;
  };

  const handleCreateOrder = async (dt: StructuredDowntime) => {
    const mapped = mapToAnmaisysLine(productionLine);
    if (!mapped) {
      toast.error('No line mapping available');
      return;
    }
    setCreatingOrderId(dt.id);
    try {
      const { order_id } = await createMaintenanceOrder({
        description: `${reasonLabel(dt.reason)} on ${productionLine}${dt.comment ? ` — ${dt.comment}` : ''}`,
        priority: 'medium',
        machine: null,
        requester_name: user?.email || lineLeader || 'Anplanner',
        line_name: mapped,
        line_at_time: productionLine,
        notes: `From shift ${date} ${shiftType} (${dt.duration} min downtime)`,
      });
      setCreatedOrders(prev => ({ ...prev, [dt.id]: order_id }));
      toast.success(`Order #${order_id} created`);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to create order');
    } finally {
      setCreatingOrderId(null);
    }
  };

  const { totalProduction, performance } = useMemo(() => {
    const total = skuRows.reduce((sum, row) => sum + (row.realProduction || 0), 0);
    const perf = lineTarget > 0 ? (total / lineTarget) * 100 : 0;
    return { totalProduction: total, performance: perf };
  }, [skuRows, lineTarget]);

  // Initialize form state when session changes — fetch items fresh from DB
  useEffect(() => {
    if (!session || !open) return;
    setDate(session.date);
    setShiftType(session.shift);
    setProductionLine(session.productionLine);
    setLineLeader(session.lineLeader);
    setStaffPlanned(session.staffPlanned);
    setStaffActual(session.staffActual);
    setObservations(session.comments);
    setLineTarget(session.plannedQuantity);

    // Seed immediately from already-loaded session data so the form shows values right away
    setSkuRows((session.items || []).map(item => ({
      id: item.id,
      sku: item.sku,
      product: item.productName || '',
      productionTarget: item.quantityTarget || 0,
      realProduction: item.quantityActual || 0,
      isFoundInDb: true,
      batchNumber: '',
      blenderSize: 0,
      weightPerUnit: 0,
    })));
    setStructuredDowntimes((session.structuredDowntimes || []).map(dt => ({
      id: dt.id,
      category: dt.category,
      reason: dt.reason,
      duration: dt.duration,
      comment: dt.comment || '',
    })));
    // load quality actions
    fetchQualityActionsForSessions([session.id]).then(map => {
      setQualityRows(map[session.id] || []);
    });



    // Then refresh from DB to pick up any newer changes
    const loadFreshData = async () => {
      const [itemsRes, downtimesRes] = await Promise.all([
        supabase.from('production_items').select('*').eq('session_id', session.id),
        supabase.from('structured_downtimes').select('*').eq('session_id', session.id),
      ]);

      if (itemsRes.data && itemsRes.data.length > 0) {
        setSkuRows(itemsRes.data.map(item => ({
          id: item.id,
          sku: item.sku,
          product: item.product_name || '',
          productionTarget: item.quantity_target || 0,
          realProduction: item.quantity_actual || 0,
          isFoundInDb: true,
          batchNumber: '',
          blenderSize: 0,
          weightPerUnit: 0,
        })));
      }

      if (downtimesRes.data && downtimesRes.data.length > 0) {
        setStructuredDowntimes(downtimesRes.data.map(dt => ({
          id: dt.id,
          category: dt.category,
          reason: dt.reason,
          duration: dt.duration,
          comment: dt.comment || '',
        })));
      }
    };
    loadFreshData();
  }, [session?.id, open]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const validRows = skuRows.filter(row => row.sku.trim());
    if (validRows.length === 0) { toast.error('At least one SKU is required'); return; }
    if (!isOperator && lineTarget <= 0) { toast.error('Line Production Target is required'); return; }

    // Check for duplicate SKUs
    const skuCounts = new Map<string, number>();
    validRows.forEach(row => {
      const key = row.sku.trim().toLowerCase();
      if (key) skuCounts.set(key, (skuCounts.get(key) || 0) + 1);
    });
    const duplicates = [...skuCounts.entries()].filter(([, c]) => c > 1).map(([k]) => k);
    if (duplicates.length > 0) {
      toast.error(`Duplicate SKUs: ${duplicates.join(', ')}. Each SKU can only appear once per session.`);
      return;
    }

    setIsSubmitting(true);
    const safetyTimer = setTimeout(() => {
      console.error('[EditShiftDialog] Safety timeout fired — save took >30s');
      setIsSubmitting(false);
      toast.error('Save timed out after 30s. Check the console/network tab for details.');
    }, 30_000);
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
          })),
          comments: observations,
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

      // Supervisor/Admin path: full update (no longer auto-creates products)

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
        
        staffPlanned, staffActual,
      });

      if (!result.success) {
        toast.error(`Failed to update: ${result.error}`);
        return;
      }

      // Save quality actions (supervisor/admin only)
      try {
        const qr = await saveQualityActionsForSession({
          sessionId: session.id,
          productionLine: productionLine.trim(),
          lineLeader: lineLeader.trim(),
          date,
          shiftType,
          rows: qualityRows,
          recordedBy: user?.id ?? null,
        });
        if (!qr.success) {
          toast.error(`Quality save failed: ${qr.error}`);
        } else {
          // Notify any open views (e.g. /quality-actions-log) to refetch
          window.dispatchEvent(new CustomEvent('quality-actions-changed', { detail: { sessionId: session.id } }));
        }
      } catch (qErr) {
        console.error('Quality save threw:', qErr);
        toast.error(`Quality save failed: ${qErr instanceof Error ? qErr.message : String(qErr)}`);
      }

      toast.success('Session updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error(`Failed to update session: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(safetyTimer);
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

          <div className="space-y-1 border-t pt-4">
            <Label className="text-xs">Comments / Observations</Label>
            <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>

          {!isOperator && (
            <div className="border-t pt-4">
              <QualityActionsForm rows={qualityRows} onChange={setQualityRows} />
            </div>
          )}

          {maintenanceDowntimes.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm flex items-center gap-2 font-medium">
                <Wrench size={16} className="text-primary" /> Maintenance Downtimes
              </Label>
              <div className="space-y-2">
                {maintenanceDowntimes.map(dt => {
                  const mapped = mapToAnmaisysLine(productionLine);
                  const created = createdOrders[dt.id];
                  const isCreating = creatingOrderId === dt.id;
                  return (
                    <div key={dt.id} className="flex items-center justify-between gap-3 p-2 rounded border bg-muted/30">
                      <div className="text-sm min-w-0 flex-1">
                        <div className="font-medium truncate">{reasonLabel(dt.reason)} · {dt.duration} min</div>
                        {dt.comment && <div className="text-xs text-muted-foreground truncate">{dt.comment}</div>}
                      </div>
                      {created ? (
                        <span className="text-xs text-green-600 font-medium whitespace-nowrap">Order #{created} created</span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!mapped || isCreating}
                          onClick={() => handleCreateOrder(dt)}
                        >
                          {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                          {!mapped ? 'No line mapping' : isCreating ? 'Creating...' : 'Open Maintenance Order'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
