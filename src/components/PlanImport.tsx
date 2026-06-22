import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface PlanRow {
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
  target_upm: number;
  errors: string[];
}

function parseTime(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  // Handle Excel decimal time (0.25 = 06:00)
  const num = Number(s);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMins = Math.round(num * 24 * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  // HH:MM
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  // AM/PM format
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

function timeToHours(t: string): number | null {
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function PlanImport({ open, onClose, onImported }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const { default: ExcelJS } = await import('exceljs');
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('No worksheet found');

      const parsed: PlanRow[] = [];

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
        const targetUpm = Number(vals[10]) || 0; // Target (units/min) — optional, falls back to calculated

        if (!dateVal && !productCode && !qty) return;

        const errors: string[] = [];

        // Parse date
        let dateStr = dateVal;
        if (typeof vals[0] === 'object' && vals[0] !== null && 'toISOString' in (vals[0] as object)) {
          dateStr = (vals[0] as Date).toISOString().split('T')[0];
        }
        if (!dateStr || isNaN(new Date(dateStr).getTime())) errors.push('Invalid date');

        if (!workCentre) errors.push('Work Centre is required');
        if (!productCode) errors.push('Product Code is required');
        if (!qty || qty <= 0) errors.push('QTY must be a positive number');
        if (startTime && !timeToHours(startTime) && timeToHours(startTime) !== 0) errors.push('Invalid Start Time');
        if (finishTime && !timeToHours(finishTime) && timeToHours(finishTime) !== 0) errors.push('Invalid Finish Time');
        if (shift && shift !== 'DAY' && shift !== 'NIGHT') errors.push('Shift must be DAY or NIGHT');
        if (!shift) errors.push('Shift is required');

        parsed.push({
          rowNum: rowNumber,
          date: dateStr,
          assembly_number: assemblyNum,
          work_centre: workCentre,
          product_code: productCode,
          product_description: productDesc,
          weight_kg: weightKg,
          qty,
          start_time: startTime,
          finish_time: finishTime,
          shift_type: shift || 'DAY',
          errors,
        });
      });

      if (parsed.length === 0) toast.error('No data rows found in the file');
      setRows(parsed);
    } catch (err) {
      toast.error(`Failed to parse file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);

  const handleConfirm = async () => {
    if (validRows.length === 0) { toast.error('No valid rows to import'); return; }
    setSaving(true);
    try {
      const inserts = validRows.map(r => {
        const total_kg = r.qty * r.weight_kg;
        const startH = timeToHours(r.start_time);
        const endH = timeToHours(r.finish_time);
        let production_hours = 0;
        if (startH !== null && endH !== null) {
          production_hours = endH >= startH ? endH - startH : (24 - startH) + endH;
        }
        const units_per_min_expected = production_hours > 0 ? r.qty / (production_hours * 60) : 0;

        return {
          date: r.date,
          assembly_number: r.assembly_number || null,
          work_centre: r.work_centre,
          product_code: r.product_code,
          product_description: r.product_description || null,
          weight_kg: r.weight_kg,
          qty: r.qty,
          start_time: r.start_time || null,
          finish_time: r.finish_time || null,
          shift_type: r.shift_type,
          workers_in_line: 0,
          support_workers: 0,
          comments: null,
          pcl_list: null,
          total_kg: Math.round(total_kg * 1000) / 1000,
          production_hours: Math.round(production_hours * 100) / 100,
          worked_hours: Math.round(production_hours * 100) / 100,
          avg_kg_per_worker: 0,
          units_per_min_expected: Math.round(units_per_min_expected * 10000) / 10000,
          units_per_min: 0,
          revenue_per_hour: 0,
          line_revenue: 0,
          ctp_percent: 100,
          ctp_comment: null,
          created_by: user?.id || null,
        };
      });

      const { error } = await supabase.from('production_plans').insert(inserts);
      if (error) throw error;

      toast.success(`Imported ${validRows.length} plan row(s) successfully!`);
      onImported();
      onClose();
      setRows([]);
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Import Production Plan</h2>
          <button onClick={() => { onClose(); setRows([]); }} className="p-2 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Upload size={48} className="text-muted-foreground" />
              <p className="text-muted-foreground">Upload your completed Excel template</p>
              <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                <Upload size={18} />
                Select File
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
              </div>

              <div className="border border-border rounded-lg overflow-auto max-h-[55vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Assembly #</TableHead>
                      <TableHead>Work Centre</TableHead>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">QTY</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Finish</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => {
                      const hasErr = row.errors.length > 0;
                      return (
                        <TableRow key={i} className={hasErr ? 'bg-destructive/10' : 'bg-green-500/5'}>
                          <TableCell className="font-mono text-xs">{row.rowNum}</TableCell>
                          <TableCell className="text-xs">{row.date}</TableCell>
                          <TableCell className="text-xs">{row.assembly_number}</TableCell>
                          <TableCell className="text-xs">{row.work_centre}</TableCell>
                          <TableCell className="text-xs font-medium">{row.product_code}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{row.product_description}</TableCell>
                          <TableCell className="text-right text-xs">{row.weight_kg}</TableCell>
                          <TableCell className="text-right text-xs">{row.qty.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{row.start_time}</TableCell>
                          <TableCell className="text-xs">{row.finish_time}</TableCell>
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
            <Button variant="outline" onClick={() => setRows([])}>
              Choose Different File
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { onClose(); setRows([]); }}>Cancel</Button>
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
