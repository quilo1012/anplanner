import { useState, useCallback } from 'react';
import ExcelJS from 'exceljs';
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
  weight_kg: number;
  qty: number;
  start_time: string;
  finish_time: string;
  shift_type: string;
  workers_in_line: number;
  support_workers: number;
  comments: string;
  pcl_list: string;
  // Calculated
  total_kg: number;
  production_hours: number;
  worked_hours: number;
  avg_kg_per_worker: number;
  units_per_min_expected: number;
  ctp_percent: number;
  ctp_comment: string;
  // Validation
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
  // HH:MM or H:MM
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  return s;
}

function timeToHours(t: string): number | null {
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]) + parseInt(match[2]) / 60;
}

function calcRow(row: Omit<PlanRow, 'total_kg' | 'production_hours' | 'worked_hours' | 'avg_kg_per_worker' | 'units_per_min_expected' | 'ctp_percent' | 'ctp_comment'>): PlanRow {
  const total_kg = row.qty * row.weight_kg;
  const startH = timeToHours(row.start_time);
  const endH = timeToHours(row.finish_time);
  let production_hours = 0;
  if (startH !== null && endH !== null) {
    production_hours = endH >= startH ? endH - startH : (24 - startH) + endH;
  }
  const worked_hours = production_hours;
  const totalWorkers = row.workers_in_line + row.support_workers;
  const avg_kg_per_worker = totalWorkers > 0 ? total_kg / totalWorkers : 0;
  const units_per_min_expected = production_hours > 0 ? row.qty / (production_hours * 60) : 0;
  // CTP: plan import = 100% by default (actual vs planned calculated later)
  const ctp_percent = 100;
  const ctp_comment = '';

  return {
    ...row,
    total_kg: Math.round(total_kg * 1000) / 1000,
    production_hours: Math.round(production_hours * 100) / 100,
    worked_hours: Math.round(worked_hours * 100) / 100,
    avg_kg_per_worker: Math.round(avg_kg_per_worker * 1000) / 1000,
    units_per_min_expected: Math.round(units_per_min_expected * 10000) / 10000,
    ctp_percent,
    ctp_comment,
  };
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
  const [productCodes, setProductCodes] = useState<Set<string>>(new Set());

  const loadProductCodes = useCallback(async () => {
    const { data } = await supabase.from('products').select('product_code');
    return new Set((data || []).map(p => p.product_code.toLowerCase()));
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const codes = await loadProductCodes();
      setProductCodes(codes);

      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('No worksheet found');

      const parsed: PlanRow[] = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        const vals = (row.values as unknown[]).slice(1); // 1-indexed
        const dateVal = String(vals[0] || '').trim();
        const assemblyNum = String(vals[1] || '').trim();
        const workCentre = String(vals[2] || '').trim();
        const productCode = String(vals[3] || '').trim();
        const weightKg = Number(vals[4]) || 0;
        const qty = Number(vals[5]) || 0;
        const startTime = parseTime(vals[6]);
        const finishTime = parseTime(vals[7]);
        const shift = String(vals[8] || '').trim().toUpperCase();
        const workersInLine = Number(vals[9]) || 0;
        const supportWorkers = Number(vals[10]) || 0;
        const comments = String(vals[11] || '').trim();
        const pclList = String(vals[12] || '').trim();

        // Skip completely empty rows
        if (!dateVal && !productCode && !qty) return;

        const errors: string[] = [];

        // Validate date
        const dateStr = (typeof dateVal === 'object' && dateVal !== null && 'toISOString' in (dateVal as any))
          ? (dateVal as Date).toISOString().split('T')[0]
          : dateVal;
        if (!dateStr || isNaN(new Date(dateStr).getTime())) {
          errors.push('Invalid date');
        }

        // Validate product code
        if (!productCode) {
          errors.push('Product Code is required');
        } else if (!codes.has(productCode.toLowerCase())) {
          errors.push(`Product "${productCode}" not found in catalog`);
        }

        // Validate QTY
        if (!qty || qty <= 0) errors.push('QTY must be a positive number');

        // Validate times
        if (startTime && !timeToHours(startTime) && timeToHours(startTime) !== 0) errors.push('Invalid Start Time');
        if (finishTime && !timeToHours(finishTime) && timeToHours(finishTime) !== 0) errors.push('Invalid Finish Time');

        // Validate shift
        if (shift && shift !== 'DAY' && shift !== 'NIGHT') errors.push('Shift must be DAY or NIGHT');
        if (!shift) errors.push('Shift is required');

        const baseRow = {
          rowNum: rowNumber,
          date: dateStr,
          assembly_number: assemblyNum,
          work_centre: workCentre,
          product_code: productCode,
          weight_kg: weightKg,
          qty,
          start_time: startTime,
          finish_time: finishTime,
          shift_type: shift || 'DAY',
          workers_in_line: workersInLine,
          support_workers: supportWorkers,
          comments,
          pcl_list: pclList,
          errors,
        };

        parsed.push(calcRow(baseRow));
      });

      if (parsed.length === 0) {
        toast.error('No data rows found in the file');
      }

      setRows(parsed);
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const errorRows = rows.filter(r => r.errors.length > 0);
  const hasErrors = errorRows.length > 0;

  const handleConfirm = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    setSaving(true);
    try {
      const inserts = validRows.map(r => ({
        date: r.date,
        assembly_number: r.assembly_number || null,
        work_centre: r.work_centre || null,
        product_code: r.product_code,
        weight_kg: r.weight_kg,
        qty: r.qty,
        start_time: r.start_time || null,
        finish_time: r.finish_time || null,
        shift_type: r.shift_type,
        workers_in_line: r.workers_in_line,
        support_workers: r.support_workers,
        comments: r.comments || null,
        pcl_list: r.pcl_list || null,
        total_kg: r.total_kg,
        production_hours: r.production_hours,
        worked_hours: r.worked_hours,
        avg_kg_per_worker: r.avg_kg_per_worker,
        units_per_min_expected: r.units_per_min_expected,
        units_per_min: 0,
        revenue_per_hour: 0,
        line_revenue: 0,
        ctp_percent: r.ctp_percent,
        ctp_comment: r.ctp_comment || null,
        created_by: user?.id || null,
      }));

      const { error } = await supabase.from('production_plans').insert(inserts);
      if (error) throw error;

      toast.success(`Imported ${validRows.length} plan row(s) successfully!`);
      onImported();
      onClose();
      setRows([]);
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl w-[95vw] max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Import Production Plan</h2>
          <button onClick={() => { onClose(); setRows([]); }} className="p-2 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
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
              {/* Summary */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-foreground">{validRows.length} valid row(s)</span>
                </div>
                {hasErrors && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle size={16} className="text-destructive" />
                    <span className="text-destructive">{errorRows.length} row(s) with errors</span>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-border rounded-lg overflow-auto max-h-[55vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Work Centre</TableHead>
                      <TableHead className="text-right">QTY</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Total KG</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Prod Hrs</TableHead>
                      <TableHead className="text-right">Workers</TableHead>
                      <TableHead className="text-right">Avg KG/W</TableHead>
                      <TableHead className="text-right">UPM (Exp)</TableHead>
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
                          <TableCell className="text-xs font-medium">{row.product_code}</TableCell>
                          <TableCell className="text-xs">{row.work_centre}</TableCell>
                          <TableCell className="text-right text-xs">{row.qty.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs">{row.weight_kg}</TableCell>
                          <TableCell className="text-right text-xs font-medium">{row.total_kg.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{row.start_time}</TableCell>
                          <TableCell className="text-xs">{row.finish_time}</TableCell>
                          <TableCell className="text-xs">{row.shift_type}</TableCell>
                          <TableCell className="text-right text-xs">{row.production_hours.toFixed(1)}</TableCell>
                          <TableCell className="text-right text-xs">{row.workers_in_line + row.support_workers}</TableCell>
                          <TableCell className="text-right text-xs">{row.avg_kg_per_worker.toFixed(1)}</TableCell>
                          <TableCell className="text-right text-xs">{row.units_per_min_expected.toFixed(2)}</TableCell>
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

        {/* Footer */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <Button variant="outline" onClick={() => setRows([])}>
              Choose Different File
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { onClose(); setRows([]); }}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={validRows.length === 0 || saving}
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : `Import ${validRows.length} Row(s)`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
