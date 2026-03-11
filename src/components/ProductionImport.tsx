import { useState } from 'react';
import ExcelJS from 'exceljs';
import { Upload, AlertCircle, CheckCircle2, X, Loader2, Link2 } from 'lucide-react';
import { useShifts } from '@/contexts/ShiftContext';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
        const dateVal = String(vals[0] || '').trim();
        const assemblyNum = String(vals[1] || '').trim();
        const workCentre = String(vals[2] || '').trim();
        const productCode = String(vals[3] || '').trim();
        const productDesc = String(vals[4] || '').trim();
        const weightKg = Number(vals[5]) || 0;
        const qty = Number(vals[6]) || 0;
        const startTime = parseTime(vals[7]);
        const finishTime = parseTime(vals[8]);
        const shift = String(vals[9] || '').trim().toUpperCase();

        if (!dateVal && !productCode && !qty) return;

        const errors: string[] = [];
        let dateStr = dateVal;
        if (typeof vals[0] === 'object' && vals[0] !== null && 'toISOString' in (vals[0] as any)) {
          dateStr = (vals[0] as Date).toISOString().split('T')[0];
        }
        if (!dateStr || isNaN(new Date(dateStr).getTime())) errors.push('Invalid date');
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

      const entries = [...groups.entries()];
      const results = await Promise.allSettled(
        entries.map(([, groupRows]) => {
          const first = groupRows[0];

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

          const items = [...skuAgg.entries()].map(([sku, agg]) => ({
            sku,
            productName: agg.productName,
            quantityTarget: agg.targetQty,
            quantityActual: agg.actualQty,
          }));

          const totalPlanned = items.reduce((s, i) => s + i.quantityTarget, 0);

          return saveSession({
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
        })
      );

      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      if (failures.length > 0) {
        toast.error(`Failed to import ${failures.length} session(s)`);
      } else {
        toast.success(`Imported ${entries.length} session(s) with ${validRows.length} product(s)!`);
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
