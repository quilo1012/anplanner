import { useState } from 'react';
import ExcelJS from 'exceljs';
import { Upload, AlertCircle, CheckCircle2, X, Loader2, Link2, RefreshCw } from 'lucide-react';
import { useShifts } from '@/contexts/ShiftContext';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeLineName } from '@/utils/normalizeLineName';

interface ImportRow {
  rowNum: number;
  date: string;
  assembly_number: string;
  work_centre: string;
  product_code: string;
  product_description: string;
  weight_kg: number;
  qty: number;
  start_time: string;
  finish_time: string;
  shift_type: string;
  errors: string[];
  plannedQty?: number;
}

function parseDate(val: unknown): string {
  if (!val) return '';
  // ExcelJS Date object
  if (typeof val === 'object' && val !== null && 'toISOString' in (val as any)) {
    return (val as Date).toISOString().split('T')[0];
  }
  const s = String(val).trim();
  // Already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // European format: d/m/yy or dd/mm/yyyy (with / or -)
  const eurMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (eurMatch) {
    const day = parseInt(eurMatch[1]);
    const month = parseInt(eurMatch[2]);
    let year = parseInt(eurMatch[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  // Fallback: try native Date
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
}

function parseTime(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  const num = Number(s);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMins = Math.round(num * 24 * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return s;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProductionImport({ open, onClose }: Props) {
  const { saveSession, refreshSessions } = useShifts();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planMap, setPlanMap] = useState<Map<string, number>>(new Map());

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('No worksheet found');

      const parsed: ImportRow[] = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const vals = (row.values as unknown[]).slice(1);
        const rawDate = vals[0];
        const assemblyNum = String(vals[1] || '').trim();
        const workCentre = normalizeLineName(String(vals[2] || '').trim());
        const productCode = String(vals[3] || '').trim();
        const productDesc = String(vals[4] || '').trim();
        const weightKg = Number(vals[5]) || 0;
        const qty = Number(vals[6]) || 0;
        const startTime = parseTime(vals[7]);
        const finishTime = parseTime(vals[8]);
        const shift = String(vals[9] || '').trim().toUpperCase();

        if (!String(rawDate || '').trim() && !productCode && !qty) return;

        const errors: string[] = [];
        const dateStr = parseDate(rawDate);
        if (!dateStr) errors.push('Invalid date format');
        if (!workCentre) errors.push('Work Centre is required');
        if (!productCode) errors.push('Product Code is required');
        if (!qty || qty <= 0) errors.push('QTY must be positive');
        if (shift && shift !== 'DAY' && shift !== 'NIGHT') errors.push('Shift must be DAY or NIGHT');
        if (!shift) errors.push('Shift is required');

        parsed.push({
          rowNum: rowNumber, date: dateStr, assembly_number: assemblyNum,
          work_centre: workCentre, product_code: productCode, product_description: productDesc,
          weight_kg: weightKg, qty, start_time: startTime, finish_time: finishTime,
          shift_type: shift || 'DAY', errors,
        });
      });

      if (parsed.length === 0) { toast.error('No data rows found'); setLoading(false); return; }

      // Fetch matching plans from production_plans
      const validParsed = parsed.filter(r => r.errors.length === 0);
      const dates = [...new Set(validParsed.map(r => r.date))];
      const newPlanMap = new Map<string, number>();

      if (dates.length > 0) {
        const { data: plans } = await supabase
          .from('production_plans')
          .select('date, work_centre, product_code, shift_type, qty')
          .in('date', dates);

        plans?.forEach(p => {
          const key = `${p.work_centre}|${p.date}|${p.product_code}|${p.shift_type}`;
          newPlanMap.set(key, (newPlanMap.get(key) || 0) + p.qty);
        });
      }

      // Enrich rows with planned qty
      for (const row of parsed) {
        if (row.errors.length === 0) {
          const key = `${row.work_centre}|${row.date}|${row.product_code}|${row.shift_type}`;
          row.plannedQty = newPlanMap.get(key);
        }
      }

      setPlanMap(newPlanMap);
      setRows(parsed);
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);
  const matchedRows = validRows.filter(r => r.plannedQty !== undefined);

  const handleConfirm = async () => {
    if (validRows.length === 0) { toast.error('No valid rows to import'); return; }
    setSaving(true);

    try {
      // Group by (work_centre, date, shift)
      const groups = new Map<string, ImportRow[]>();
      for (const row of validRows) {
        const key = `${row.work_centre}|${row.date}|${row.shift_type}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      // Fetch existing sessions for all matching groups
      const dates = [...new Set(validRows.map(r => r.date))];
      const lines = [...new Set(validRows.map(r => r.work_centre))];
      
      const { data: existingSessions } = await supabase
        .from('production_sessions')
        .select('id, production_line, date, shift_type')
        .in('date', dates)
        .in('production_line', lines);

      // Build lookup: "line|date|shift" → session id
      const sessionLookup = new Map<string, string>();
      existingSessions?.forEach(s => {
        const key = `${s.production_line}|${s.date}|${s.shift_type.toUpperCase()}`;
        sessionLookup.set(key, s.id);
      });

      // Fetch existing items for those sessions
      const existingSessionIds = [...new Set([...(existingSessions || []).map(s => s.id)])];
      let existingItemsMap = new Map<string, { id: string; sku: string; quantity_actual: number }[]>();
      
      if (existingSessionIds.length > 0) {
        const { data: existingItems } = await supabase
          .from('production_items')
          .select('id, session_id, sku, quantity_actual')
          .in('session_id', existingSessionIds);
        
        existingItems?.forEach(item => {
          const list = existingItemsMap.get(item.session_id) || [];
          list.push(item);
          existingItemsMap.set(item.session_id, list);
        });
      }

      const entries = [...groups.entries()];
      let updatedCount = 0;
      let createdCount = 0;

      const results = await Promise.allSettled(
        entries.map(async ([key, groupRows]) => {
          const first = groupRows[0];
          const sessionKey = `${first.work_centre}|${first.date}|${first.shift_type}`;
          const existingSessionId = sessionLookup.get(sessionKey);

          // Aggregate same-SKU rows within this group
          const skuAgg = new Map<string, { productName: string; actualQty: number; targetQty: number }>();
          for (const r of groupRows) {
            const existing = skuAgg.get(r.product_code);
            const planKey = `${r.work_centre}|${r.date}|${r.product_code}|${r.shift_type}`;
            const plannedQty = planMap.get(planKey);
            if (existing) {
              existing.actualQty += r.qty;
              existing.targetQty += plannedQty ?? r.qty;
            } else {
              skuAgg.set(r.product_code, {
                productName: r.product_description || r.product_code,
                actualQty: r.qty,
                targetQty: plannedQty ?? r.qty,
              });
            }
          }

          if (existingSessionId) {
            // SYNC MODE: update quantity_actual on existing items, insert new SKUs
            const existingItems = existingItemsMap.get(existingSessionId) || [];
            const existingSkuMap = new Map(existingItems.map(i => [i.sku, i]));

            const updatePromises: PromiseLike<any>[] = [];
            const newItems: { session_id: string; sku: string; product_name: string; quantity_target: number; quantity_actual: number }[] = [];

            for (const [sku, agg] of skuAgg) {
              const existingItem = existingSkuMap.get(sku);
              if (existingItem) {
                // Update quantity_actual
                updatePromises.push(
                  supabase
                    .from('production_items')
                    .update({ quantity_actual: agg.actualQty })
                    .eq('id', existingItem.id)
                    .then()
                );
              } else {
                // New SKU → insert
                newItems.push({
                  session_id: existingSessionId,
                  sku,
                  product_name: agg.productName,
                  quantity_target: agg.targetQty,
                  quantity_actual: agg.actualQty,
                });
              }
            }

            await Promise.all(updatePromises);
            if (newItems.length > 0) {
              await supabase.from('production_items').insert(newItems);
            }

            // Update planned_quantity on the session
            const totalPlanned = [...skuAgg.values()].reduce((s, a) => s + a.targetQty, 0);
            // Recalculate total with existing items that weren't in import
            const allItems = await supabase.from('production_items').select('quantity_target').eq('session_id', existingSessionId);
            const newTotalPlanned = allItems.data?.reduce((s, i) => s + (i.quantity_target || 0), 0) || totalPlanned;
            
            await supabase
              .from('production_sessions')
              .update({ planned_quantity: newTotalPlanned, updated_at: new Date().toISOString() })
              .eq('id', existingSessionId);

            updatedCount++;
          } else {
            // CREATE MODE: new session via saveSession
            const items = [...skuAgg.entries()].map(([sku, agg]) => ({
              sku,
              productName: agg.productName,
              quantityTarget: agg.targetQty,
              quantityActual: agg.actualQty,
            }));

            const totalPlanned = items.reduce((s, i) => s + i.quantityTarget, 0);

            await saveSession({
              date: first.date,
              shift: first.shift_type as 'DAY' | 'NIGHT',
              productionLine: first.work_centre,
              lineLeader: 'Imported',
              plannedQuantity: totalPlanned,
              items,
              comments: '',
              staffPlanned: 0,
              staffActual: 0,
            }, { skipRefresh: true });

            createdCount++;
          }
        })
      );

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        toast.error(`Failed to import ${failures.length} session(s)`);
      } else {
        const parts: string[] = [];
        if (createdCount > 0) parts.push(`${createdCount} sessão(ões) criada(s)`);
        if (updatedCount > 0) parts.push(`${updatedCount} sessão(ões) atualizada(s)`);
        toast.success(`Registos de produção guardados com sucesso! ${parts.join(', ')} com ${validRows.length} produto(s).`);
      }

      await refreshSessions();
      onClose();
      setRows([]);
      setPlanMap(new Map());
      navigate('/history');
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const getPerfColor = (perf: number) => {
    if (perf >= 100) return 'text-green-600 dark:text-green-400';
    if (perf >= 90) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-destructive';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Import Production Data</h2>
          <button onClick={() => { onClose(); setRows([]); setPlanMap(new Map()); }} className="p-2 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Upload size={48} className="text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Upload Excel with columns: Date, Assembly Number, Work Centre, Product Code, Description, Weight, QTY, Start Time, Finish Time, Shift
              </p>
              <p className="text-xs text-muted-foreground">
                Rows are grouped by Work Centre + Date + Shift. Planned QTY is auto-matched from existing plans.
              </p>
              <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                <Upload size={18} /> Select File
                <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
              {loading && <Loader2 size={24} className="animate-spin text-primary" />}
            </div>
          ) : (
            <>
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-foreground">{validRows.length} valid row(s)</span>
                </div>
                {errorRows.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle size={16} className="text-destructive" />
                    <span className="text-destructive">{errorRows.length} row(s) with errors</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  → {new Set(validRows.map(r => `${r.work_centre}|${r.date}|${r.shift_type}`)).size} session(s) will be created
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Link2 size={16} className="text-primary" />
                  <span className="text-foreground">{matchedRows.length} of {validRows.length} rows matched to plans</span>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-auto max-h-[55vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Work Centre</TableHead>
                      <TableHead>Product Code</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Planned</TableHead>
                      <TableHead className="text-right">Perf %</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => {
                      const hasErr = row.errors.length > 0;
                      const perf = row.plannedQty ? (row.qty / row.plannedQty) * 100 : undefined;
                      return (
                        <TableRow key={i} className={hasErr ? 'bg-destructive/10' : 'bg-green-500/5'}>
                          <TableCell className="font-mono text-xs">{row.rowNum}</TableCell>
                          <TableCell className="text-xs">{row.date}</TableCell>
                          <TableCell className="text-xs">{row.work_centre}</TableCell>
                          <TableCell className="text-xs font-medium">{row.product_code}</TableCell>
                          <TableCell className="text-right text-xs">{row.qty.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs">
                            {row.plannedQty !== undefined ? row.plannedQty.toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className={`text-right text-xs font-semibold ${perf !== undefined ? getPerfColor(perf) : 'text-muted-foreground'}`}>
                            {perf !== undefined ? `${perf.toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="text-xs">{row.shift_type}</TableCell>
                          <TableCell>
                            {hasErr ? (
                              <div className="flex items-start gap-1">
                                <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
                                <span className="text-xs text-destructive">{row.errors.join('; ')}</span>
                              </div>
                            ) : (
                              <CheckCircle2 size={14} className="text-green-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <Button variant="outline" onClick={() => { setRows([]); setPlanMap(new Map()); }}>Choose Different File</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { onClose(); setRows([]); setPlanMap(new Map()); }}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={validRows.length === 0 || saving}>
                {saving ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : `Import ${validRows.length} Row(s)`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
