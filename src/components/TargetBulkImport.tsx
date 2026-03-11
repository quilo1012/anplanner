import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, Check, X, AlertTriangle } from 'lucide-react';
import ExcelJS from 'exceljs';

interface ParsedRow {
  product_code: string;
  production_line: string;
  product_description: string | null;
  weight_per_unit: number;
  blender_capacity: number;
  expected_units_per_hour: number;
  valid: boolean;
  errors: string[];
}

interface TargetBulkImportProps {
  onImportComplete: () => void;
  targets: Array<{
    product_code: string;
    production_line: string;
    product_description: string | null;
    weight_per_unit: number;
    blender_capacity: number;
    expected_units_per_hour: number;
  }>;
}

const HEADER_MAP: Record<string, string> = {
  productcode: 'product_code',
  product_code: 'product_code',
  sku: 'product_code',
  skucode: 'product_code',
  productionline: 'production_line',
  production_line: 'production_line',
  line: 'production_line',
  workcentre: 'production_line',
  work_centre: 'production_line',
  productdescription: 'product_description',
  product_description: 'product_description',
  description: 'product_description',
  weightkg: 'weight_per_unit',
  weight_per_unit: 'weight_per_unit',
  weightperunit: 'weight_per_unit',
  weight: 'weight_per_unit',
  blendercapacitykg: 'blender_capacity',
  blendercapacity: 'blender_capacity',
  blender_capacity: 'blender_capacity',
  blender: 'blender_capacity',
  unitsperhour: 'expected_units_per_hour',
  units_per_hour: 'expected_units_per_hour',
  expected_units_per_hour: 'expected_units_per_hour',
  uph: 'expected_units_per_hour',
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function mapHeaders(rawHeaders: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  rawHeaders.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (HEADER_MAP[key]) map[i] = HEADER_MAP[key];
  });
  return map;
}

function parseNumber(val: any): number {
  if (val == null || val === '') return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function validateRow(row: Omit<ParsedRow, 'valid' | 'errors'>): ParsedRow {
  const errors: string[] = [];
  if (!row.product_code?.trim()) errors.push('Product code required');
  if (!row.production_line?.trim()) errors.push('Production line required');
  if (row.weight_per_unit < 0) errors.push('Weight must be >= 0');
  if (row.blender_capacity < 0) errors.push('Blender must be >= 0');
  if (row.expected_units_per_hour < 0) errors.push('UPH must be >= 0');
  return { ...row, valid: errors.length === 0, errors };
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const rawHeaders = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const colMap = mapHeaders(rawHeaders);
    return lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
      const obj: any = {};
      Object.entries(colMap).forEach(([i, field]) => { obj[field] = cells[Number(i)] || ''; });
      return validateRow({
        product_code: String(obj.product_code || '').trim(),
        production_line: String(obj.production_line || '').trim(),
        product_description: obj.product_description?.trim() || null,
        weight_per_unit: parseNumber(obj.weight_per_unit),
        blender_capacity: parseNumber(obj.blender_capacity),
        expected_units_per_hour: parseNumber(obj.expected_units_per_hour),
      });
    }).filter(r => r.product_code || r.production_line);
  }

  // Excel
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return [];

  const headerRow = sheet.getRow(1);
  const rawHeaders: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => { rawHeaders[col - 1] = String(cell.value || ''); });
  const colMap = mapHeaders(rawHeaders);

  const rows: ParsedRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const obj: any = {};
    Object.entries(colMap).forEach(([i, field]) => {
      const cell = row.getCell(Number(i) + 1);
      obj[field] = cell.value != null ? String(cell.value) : '';
    });
    const parsed = validateRow({
      product_code: String(obj.product_code || '').trim(),
      production_line: String(obj.production_line || '').trim(),
      product_description: obj.product_description?.trim() || null,
      weight_per_unit: parseNumber(obj.weight_per_unit),
      blender_capacity: parseNumber(obj.blender_capacity),
      expected_units_per_hour: parseNumber(obj.expected_units_per_hour),
    });
    if (parsed.product_code || parsed.production_line) rows.push(parsed);
  }
  return rows;
}

export function TargetBulkImport({ onImportComplete, targets }: TargetBulkImportProps) {
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error('No data rows found in file');
        return;
      }
      setPreview(rows);
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse file');
    }
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleConfirm = async () => {
    if (!preview) return;
    const validRows = preview.filter(r => r.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    setImporting(true);
    const { error } = await (supabase as any)
      .from('production_targets')
      .upsert(
        validRows.map(r => ({
          product_code: r.product_code,
          production_line: r.production_line,
          product_description: r.product_description,
          weight_per_unit: r.weight_per_unit,
          blender_capacity: r.blender_capacity,
          expected_units_per_hour: r.expected_units_per_hour,
        })),
        { onConflict: 'product_code,production_line' }
      );
    setImporting(false);
    if (error) {
      console.error('Upsert error:', error);
      toast.error(`Import failed: ${error.message}`);
      return;
    }
    toast.success(`${validRows.length} target(s) imported successfully`);
    setPreview(null);
    onImportComplete();
  };

  const handleExport = () => {
    if (targets.length === 0) {
      toast.error('No targets to export');
      return;
    }
    const headers = ['Product Code', 'Production Line', 'Product Description', 'Weight (kg)', 'Blender Capacity (kg)', 'Units/Hour'];
    const rows = targets.map(t => [
      t.product_code, t.production_line, t.product_description || '',
      t.weight_per_unit, t.blender_capacity, t.expected_units_per_hour,
    ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-targets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Targets exported');
  };

  const validCount = preview?.filter(r => r.valid).length || 0;
  const invalidCount = preview ? preview.length - validCount : 0;

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleFile} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-sm flex items-center gap-1.5">
          <Upload size={14} /> Import CSV/Excel
        </button>
        <button type="button" onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-3 text-sm">
              <FileSpreadsheet size={16} className="text-primary" />
              <span className="font-medium">{preview.length} row(s) found</span>
              {validCount > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Check size={12} /> {validCount} valid
                </span>
              )}
              {invalidCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle size={12} /> {invalidCount} invalid
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPreview(null)} className="btn-secondary text-xs px-2 py-1">
                <X size={12} /> Cancel
              </button>
              <button type="button" onClick={handleConfirm} disabled={importing || validCount === 0}
                className="btn-primary text-xs px-3 py-1 flex items-center gap-1 disabled:opacity-50">
                {importing ? 'Importing...' : `Import ${validCount} rows`}
              </button>
            </div>
          </div>
          <div className="max-h-[200px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="p-2 text-left text-muted-foreground">SKU</th>
                  <th className="p-2 text-left text-muted-foreground">Line</th>
                  <th className="p-2 text-left text-muted-foreground">Description</th>
                  <th className="p-2 text-right text-muted-foreground">Weight</th>
                  <th className="p-2 text-right text-muted-foreground">Blender</th>
                  <th className="p-2 text-right text-muted-foreground">UPH</th>
                  <th className="p-2 text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className={r.valid ? 'hover:bg-muted/30' : 'bg-destructive/10'}>
                    <td className="p-2 font-mono">{r.product_code || '—'}</td>
                    <td className="p-2">{r.production_line || '—'}</td>
                    <td className="p-2 truncate max-w-[150px]">{r.product_description || '—'}</td>
                    <td className="p-2 text-right">{r.weight_per_unit}</td>
                    <td className="p-2 text-right">{r.blender_capacity}</td>
                    <td className="p-2 text-right">{r.expected_units_per_hour}</td>
                    <td className="p-2">
                      {r.valid ? (
                        <Check size={12} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <span className="text-destructive" title={r.errors.join(', ')}>
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
