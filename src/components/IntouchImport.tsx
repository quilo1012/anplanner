import { useState, useCallback, useMemo } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { SHIFT_TYPES, ShiftType } from '@/types/production';
import ExcelJS from 'exceljs';

interface ParsedRow {
  line: string;
  orderNo: string;
  sku: string;
  product: string;
  quantity: number;
  valid: boolean;
  error?: string;
}

export interface LineGroup {
  line: string;
  lineLeader: string;
  rows: { sku: string; product: string; quantityTarget: number }[];
}

interface IntouchImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (groups: LineGroup[], date: string, shift: ShiftType) => Promise<void>;
}

const HEADER_MAP: Record<string, keyof Omit<ParsedRow, 'line' | 'valid' | 'error'>> = {
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

const MACHINE_PATTERN = /machine\s*[:]/i;

function extractLineName(cellValue: string): string {
  const afterMachine = cellValue.replace(MACHINE_PATTERN, '').trim();
  const parts = afterMachine.split('/');
  return parts[0].trim() || 'Unknown Line';
}

function detectColumns(headers: string[]): Record<number, keyof Omit<ParsedRow, 'line' | 'valid' | 'error'>> {
  const map: Record<number, keyof Omit<ParsedRow, 'line' | 'valid' | 'error'>> = {};
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    if (HEADER_MAP[key]) map[i] = HEADER_MAP[key];
  });
  return map;
}

function isMachineRow(row: ExcelJS.Row): string | null {
  let found: string | null = null;
  row.eachCell({ includeEmpty: false }, (cell) => {
    const val = String(cell.value ?? '');
    if (MACHINE_PATTERN.test(val)) {
      found = extractLineName(val);
    }
  });
  return found;
}

function isHeaderRow(row: ExcelJS.Row, colMap: Record<number, string>): boolean {
  // Check if this row looks like a header row (contains known header text)
  let matches = 0;
  row.eachCell({ includeEmpty: false }, (cell) => {
    const val = String(cell.value ?? '').trim().toLowerCase();
    if (HEADER_MAP[val]) matches++;
  });
  return matches >= 2;
}

async function parseXlsx(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) return [];

  // First pass: find the header row (could be row 1 or later)
  let headerRowIdx = -1;
  let colMap: Record<number, keyof Omit<ParsedRow, 'line' | 'valid' | 'error'>> = {};

  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const row = ws.getRow(r);
    const headers: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cell.value ?? '');
    });
    const candidate = detectColumns(headers);
    if (Object.values(candidate).includes('sku')) {
      colMap = candidate;
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx < 0) return [];

  // Second pass: iterate rows, track current line via Machine: markers
  let currentLine = 'Unknown Line';
  const rows: ParsedRow[] = [];

  // Check if there's a Machine: row before the header
  for (let r = 1; r < headerRowIdx; r++) {
    const machineName = isMachineRow(ws.getRow(r));
    if (machineName) currentLine = machineName;
  }

  for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    // Check for Machine: separator
    const machineName = isMachineRow(row);
    if (machineName) {
      currentLine = machineName;
      continue;
    }

    // Skip if it looks like a repeated header row
    if (isHeaderRow(row, colMap)) continue;

    // Parse data row
    const parsed: Partial<ParsedRow> = { orderNo: '', sku: '', product: '', quantity: 0, line: currentLine };
    Object.entries(colMap).forEach(([colIdx, field]) => {
      const val = row.getCell(Number(colIdx) + 1).value;
      if (field === 'quantity') {
        parsed.quantity = typeof val === 'number' ? val : parseInt(String(val ?? '0')) || 0;
      } else {
        (parsed as any)[field] = String(val ?? '').trim();
      }
    });

    if (!parsed.sku) continue;
    const valid = !!parsed.sku && parsed.quantity! > 0;
    rows.push({
      ...parsed as ParsedRow,
      valid,
      error: !parsed.sku ? 'Missing Part Code' : parsed.quantity! <= 0 ? 'Quantity must be > 0' : undefined,
    });
  }
  return rows;
}

export function IntouchImport({ open, onClose, onImport }: IntouchImportProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<ShiftType>('DAY');
  const [lineLeader, setLineLeader] = useState('');
  const [collapsedLines, setCollapsedLines] = useState<Set<string>>(new Set());

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const parsed = await parseXlsx(file);
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

  const grouped = useMemo(() => {
    const map = new Map<string, ParsedRow[]>();
    rows.forEach(r => {
      const arr = map.get(r.line) || [];
      arr.push(r);
      map.set(r.line, arr);
    });
    return Array.from(map.entries());
  }, [rows]);

  const validCount = rows.filter(r => r.valid).length;
  const lineCount = grouped.length;

  const toggleLine = (line: string) => {
    setCollapsedLines(prev => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!lineLeader.trim()) return;
    const groups: LineGroup[] = grouped.map(([line, lineRows]) => ({
      line,
      rows: lineRows.filter(r => r.valid).map(r => ({
        sku: r.sku,
        product: r.product,
        quantityTarget: r.quantity,
      })),
    })).filter(g => g.rows.length > 0);

    onImport(groups, date, shift, lineLeader);
    setRows([]);
    setDate(new Date().toISOString().split('T')[0]);
    setShift('DAY');
    setLineLeader('');
  };

  const handleClose = () => {
    setRows([]);
    setError('');
    setLineLeader('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary" />
            Import iTouching Work-To-List
          </DialogTitle>
          <DialogDescription>
            Upload the XLSX file exported from iTouching. The system will detect production lines automatically.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="py-8">
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload size={32} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {loading ? 'Parsing file...' : 'Click to select .xlsx file'}
              </span>
              <input
                type="file"
                accept=".xlsx"
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
            {/* Session fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
              <div>
                <Label htmlFor="itouch-date" className="text-xs">Date</Label>
                <Input id="itouch-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="itouch-shift" className="text-xs">Shift</Label>
                <select id="itouch-shift" value={shift} onChange={e => setShift(e.target.value as ShiftType)} className="select-field h-10">
                  {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="itouch-leader" className="text-xs">
                  Line Leader <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="itouch-leader"
                  value={lineLeader}
                  onChange={e => setLineLeader(e.target.value)}
                  placeholder="Leader name"
                  maxLength={100}
                />
              </div>
            </div>

            {/* Grouped preview */}
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
                  {grouped.map(([line, lineRows]) => {
                    const collapsed = collapsedLines.has(line);
                    const lineValid = lineRows.filter(r => r.valid).length;
                    return (
                      <> 
                        <TableRow
                          key={`header-${line}`}
                          className="bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => toggleLine(line)}
                        >
                          <TableCell colSpan={5}>
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              <span className="text-primary">{line}</span>
                              <span className="text-muted-foreground font-normal">
                                — {lineValid} product{lineValid !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {!collapsed && lineRows.map((row, i) => (
                          <TableRow key={`${line}-${i}`} className={row.valid ? '' : 'opacity-50'}>
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
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="text-sm text-muted-foreground pt-2">
              {validCount} valid product{validCount !== 1 ? 's' : ''} across {lineCount} line{lineCount !== 1 ? 's' : ''}
            </div>
          </>
        )}

        <DialogFooter>
          <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={validCount === 0 || !lineLeader.trim()}
              className="btn-primary"
            >
              <CheckCircle2 size={16} />
              Import {validCount} Product{validCount !== 1 ? 's' : ''} ({lineCount} Line{lineCount !== 1 ? 's' : ''})
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
