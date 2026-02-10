import { useState, useCallback } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { SkuRow, createEmptySkuRow } from '@/types/planner';
import ExcelJS from 'exceljs';

interface ParsedRow {
  orderNo: string;
  sku: string;
  product: string;
  quantity: number;
  valid: boolean;
  error?: string;
}

interface IntouchImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: SkuRow[]) => void;
}

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  'part code': 'sku',
  'partcode': 'sku',
  'part_code': 'sku',
  'description': 'product',
  'order quantity': 'quantity',
  'orderquantity': 'quantity',
  'order_quantity': 'quantity',
  'order no.': 'orderNo',
  'order no': 'orderNo',
  'orderno': 'orderNo',
};

function detectColumns(headers: string[]): Record<number, keyof ParsedRow> {
  const map: Record<number, keyof ParsedRow> = {};
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    if (HEADER_MAP[key]) {
      map[i] = HEADER_MAP[key];
    }
  });
  return map;
}

async function parseXlsx(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) return [];

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '');
  });

  const colMap = detectColumns(headers);
  if (!colMap || !Object.values(colMap).includes('sku')) return [];

  const rows: ParsedRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const parsed: Partial<ParsedRow> = { orderNo: '', sku: '', product: '', quantity: 0 };
    Object.entries(colMap).forEach(([colIdx, field]) => {
      const val = row.getCell(Number(colIdx) + 1).value;
      if (field === 'quantity') {
        parsed.quantity = typeof val === 'number' ? val : parseInt(String(val ?? '0')) || 0;
      } else {
        (parsed as any)[field] = String(val ?? '').trim();
      }
    });
    if (!parsed.sku) continue; // skip empty rows
    const valid = !!parsed.sku && parsed.quantity! > 0;
    rows.push({
      ...parsed as ParsedRow,
      valid,
      error: !parsed.sku ? 'Missing Part Code' : parsed.quantity! <= 0 ? 'Quantity must be > 0' : undefined,
    });
  }
  return rows;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const colMap = detectColumns(headers);
  if (!Object.values(colMap).includes('sku')) return [];

  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const parsed: Partial<ParsedRow> = { orderNo: '', sku: '', product: '', quantity: 0 };
    Object.entries(colMap).forEach(([colIdx, field]) => {
      const val = cells[Number(colIdx)]?.trim() ?? '';
      if (field === 'quantity') {
        parsed.quantity = parseInt(val) || 0;
      } else {
        (parsed as any)[field] = val;
      }
    });
    if (!parsed.sku) return null;
    const valid = !!parsed.sku && parsed.quantity! > 0;
    return {
      ...parsed as ParsedRow,
      valid,
      error: !parsed.sku ? 'Missing Part Code' : parsed.quantity! <= 0 ? 'Quantity must be > 0' : undefined,
    };
  }).filter(Boolean) as ParsedRow[];
}

export function IntouchImport({ open, onClose, onImport }: IntouchImportProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      let parsed: ParsedRow[];
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        parsed = parseCsv(text);
      } else {
        parsed = await parseXlsx(file);
      }
      if (parsed.length === 0) {
        setError('No valid data found. Ensure the file has "Part Code" and "Order Quantity" columns.');
      }
      setRows(parsed);
    } catch {
      setError('Failed to parse file. Please check the format.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConfirm = () => {
    const validRows = rows.filter(r => r.valid);
    const skuRows: SkuRow[] = validRows.map(r => ({
      ...createEmptySkuRow(),
      sku: r.sku,
      product: r.product,
      productionTarget: r.quantity,
    }));
    onImport(skuRows);
    setRows([]);
    onClose();
  };

  const handleClose = () => {
    setRows([]);
    setError('');
    onClose();
  };

  const validCount = rows.filter(r => r.valid).length;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary" />
            Import iTouching Work-To-List
          </DialogTitle>
          <DialogDescription>
            Upload the XLSX or CSV file exported from iTouching to populate SKU rows.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="py-8">
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload size={32} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {loading ? 'Parsing file...' : 'Click to select .xlsx or .csv file'}
              </span>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFile}
                className="hidden"
                disabled={loading}
              />
            </label>
            {error && (
              <p className="mt-3 text-sm text-destructive flex items-center gap-1">
                <AlertTriangle size={14} /> {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Order No.</TableHead>
                    <TableHead>Part Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row.valid ? '' : 'opacity-50'}>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <span title={row.error}><AlertTriangle size={16} className="text-destructive" /></span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.orderNo}</TableCell>
                      <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                      <TableCell className="text-sm">{row.product}</TableCell>
                      <TableCell className="text-right font-medium">{row.quantity.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-muted-foreground pt-2">
              {validCount} of {rows.length} rows valid
            </div>
          </>
        )}

        <DialogFooter>
          <button type="button" onClick={handleClose} className="btn-secondary">
            Cancel
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={validCount === 0}
              className="btn-primary"
            >
              <CheckCircle2 size={16} />
              Import {validCount} Product{validCount !== 1 ? 's' : ''}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
