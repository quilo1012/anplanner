import { useState, useCallback, useMemo, Fragment } from 'react';
import { Upload, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { SHIFT_TYPES, ShiftType } from '@/types/production';
import { StructuredDowntime } from '@/types/downtime';
import { useShifts } from '@/contexts/ShiftContext';
import { normalizeLineName } from '@/utils/normalizeLineName';
import { formatDuration } from '@/utils/formatDuration';
import { toast } from 'sonner';
import type ExcelJS from 'exceljs';

interface ParsedDowntime {
  line: string;
  category: string;
  reason: string;
  duration: number;
  comment: string;
  valid: boolean;
  error?: string;
}

interface LineMatch {
  line: string;
  sessionId: string | null;
  downtimes: ParsedDowntime[];
  existingDowntimes: StructuredDowntime[];
  newDowntimes: ParsedDowntime[]; // after dedup
}

const DOWNTIME_HEADER_MAP: Record<string, keyof Omit<ParsedDowntime, 'line' | 'valid' | 'error'>> = {
  'category': 'category',
  'categoria': 'category',
  'reason': 'reason',
  'motivo': 'reason',
  'duration': 'duration',
  'duracao': 'duration',
  'duração': 'duration',
  'duration (min)': 'duration',
  'comment': 'comment',
  'comentario': 'comment',
  'comentário': 'comment',
  'notes': 'comment',
};

const MACHINE_PATTERN = /machine\s*[:]/i;

function extractLineName(cellValue: string): string {
  const afterMachine = cellValue.replace(MACHINE_PATTERN, '').trim();
  return afterMachine.split('/')[0].trim() || 'Unknown Line';
}

function isMachineRow(row: ExcelJS.Row): string | null {
  let found: string | null = null;
  row.eachCell({ includeEmpty: false }, (cell) => {
    const val = String(cell.value ?? '');
    if (MACHINE_PATTERN.test(val)) found = extractLineName(val);
  });
  return found;
}

function detectDowntimeColumns(headers: string[]): Record<number, keyof Omit<ParsedDowntime, 'line' | 'valid' | 'error'>> {
  const map: Record<number, keyof Omit<ParsedDowntime, 'line' | 'valid' | 'error'>> = {};
  headers.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    if (DOWNTIME_HEADER_MAP[key]) map[i] = DOWNTIME_HEADER_MAP[key];
  });
  return map;
}

async function parseDowntimeXlsx(file: File): Promise<ParsedDowntime[]> {
  const { default: ExcelJSLib } = await import('exceljs');
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJSLib.Workbook();
  await wb.xlsx.load(buffer);

  // Find downtime sheet: named "downtime"/"parad", or first sheet, or second sheet
  const dtSheet = wb.worksheets.find(s => /downtime|parad/i.test(s.name)) || wb.worksheets[0];
  if (!dtSheet || dtSheet.rowCount < 2) return [];

  // Find header row
  let headerIdx = -1;
  let colMap: Record<number, keyof Omit<ParsedDowntime, 'line' | 'valid' | 'error'>> = {};

  for (let r = 1; r <= Math.min(dtSheet.rowCount, 20); r++) {
    const row = dtSheet.getRow(r);
    const headers: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cell.value ?? '');
    });
    const candidate = detectDowntimeColumns(headers);
    if (Object.values(candidate).includes('category') || Object.values(candidate).includes('reason')) {
      colMap = candidate;
      headerIdx = r;
      break;
    }
  }

  if (headerIdx < 0) return [];

  let currentLine = 'Unknown Line';
  // Check for Machine: before header
  for (let r = 1; r < headerIdx; r++) {
    const machineName = isMachineRow(dtSheet.getRow(r));
    if (machineName) currentLine = machineName;
  }

  const downtimes: ParsedDowntime[] = [];
  for (let r = headerIdx + 1; r <= dtSheet.rowCount; r++) {
    const row = dtSheet.getRow(r);
    const machineName = isMachineRow(row);
    if (machineName) { currentLine = machineName; continue; }

    const parsed: Partial<ParsedDowntime> = { line: currentLine, category: '', reason: '', duration: 0, comment: '' };
    Object.entries(colMap).forEach(([colIdx, field]) => {
      const val = row.getCell(Number(colIdx) + 1).value;
      if (field === 'duration') {
        parsed.duration = typeof val === 'number' ? val : parseInt(String(val ?? '0')) || 0;
      } else {
        (parsed as Record<string, unknown>)[field] = String(val ?? '').trim();
      }
    });

    if (!parsed.category && !parsed.reason) continue;
    const valid = !!(parsed.category || parsed.reason) && parsed.duration! > 0;
    downtimes.push({
      ...parsed as ParsedDowntime,
      valid,
      error: parsed.duration! <= 0 ? 'Duration must be > 0' : !parsed.category ? 'Missing category' : undefined,
    });
  }

  return downtimes;
}

function isDuplicate(existing: StructuredDowntime, incoming: ParsedDowntime): boolean {
  return existing.category === incoming.category &&
    existing.reason === incoming.reason &&
    existing.duration === incoming.duration;
}

interface DowntimeImportProps {
  open: boolean;
  onClose: () => void;
}

export function DowntimeImport({ open, onClose }: DowntimeImportProps) {
  const { sessions, saveDowntimesBatch, refreshSessions } = useShifts();
  const [parsedDowntimes, setParsedDowntimes] = useState<ParsedDowntime[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<ShiftType>('DAY');
  const [collapsedLines, setCollapsedLines] = useState<Set<string>>(new Set());

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const result = await parseDowntimeXlsx(file);
      if (result.length === 0) {
        setError('No downtime data found. Ensure the file has Category/Reason/Duration columns.');
      }
      setParsedDowntimes(result);
    } catch {
      setError('Failed to parse file. Please check the format.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Match parsed downtimes to existing sessions
  const lineMatches = useMemo<LineMatch[]>(() => {
    const byLine = new Map<string, ParsedDowntime[]>();
    parsedDowntimes.forEach(d => {
      const normalized = normalizeLineName(d.line);
      const arr = byLine.get(normalized) || [];
      arr.push({ ...d, line: normalized });
      byLine.set(normalized, arr);
    });

    const shiftTypeDb = shift.toLowerCase();
    return Array.from(byLine.entries()).map(([line, dts]) => {
      const session = sessions.find(s =>
        s.date === date &&
        s.shift === shift &&
        normalizeLineName(s.productionLine) === line
      );
      const existingDowntimes = session?.structuredDowntimes || [];
      const newDowntimes = dts.filter(d =>
        d.valid && !existingDowntimes.some(ex => isDuplicate(ex, d))
      );

      return {
        line,
        sessionId: session?.id || null,
        downtimes: dts,
        existingDowntimes,
        newDowntimes,
      };
    });
  }, [parsedDowntimes, sessions, date, shift]);

  const totalNew = lineMatches.reduce((sum, m) => sum + m.newDowntimes.length, 0);
  const matchedLines = lineMatches.filter(m => m.sessionId);
  const unmatchedLines = lineMatches.filter(m => !m.sessionId);

  const toggleLine = (line: string) => {
    setCollapsedLines(prev => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line); else next.add(line);
      return next;
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      let imported = 0;
      let linesUpdated = 0;

      for (const match of matchedLines) {
        if (match.newDowntimes.length === 0) continue;
        // Merge: existing + new
        const merged = [
          ...match.existingDowntimes,
          ...match.newDowntimes.map(d => ({
            id: crypto.randomUUID(),
            category: d.category,
            reason: d.reason,
            duration: d.duration,
            comment: d.comment || undefined,
          })),
        ];
        const result = await saveDowntimesBatch(match.sessionId!, merged);
        if (result.success) {
          imported += match.newDowntimes.length;
          linesUpdated++;
        }
      }

      await refreshSessions();
      toast.success(`${imported} downtimes imported across ${linesUpdated} line${linesUpdated !== 1 ? 's' : ''}`);
      handleClose();
    } catch (err) {
      toast.error('Failed to import downtimes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setParsedDowntimes([]);
    setError('');
    setCollapsedLines(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Import iTouching Downtime</DialogTitle>
          <DialogDescription>Upload iTouching XLSX downtime report</DialogDescription>
        </DialogHeader>

        {parsedDowntimes.length === 0 ? (
          <div className="py-6">
            {/* Date & Shift selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <Label htmlFor="dt-import-date" className="text-xs">Date</Label>
                <Input id="dt-import-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dt-import-shift" className="text-xs">Shift</Label>
                <select id="dt-import-shift" value={shift} onChange={e => setShift(e.target.value as ShiftType)} className="select-field h-10 w-full">
                  {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload size={32} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {loading ? 'Parsing file...' : 'Click to select .xlsx downtime report'}
              </span>
              <input type="file" accept=".xlsx" onChange={handleFile} className="hidden" disabled={loading} />
            </label>
            {error && (
              <p className="mt-3 text-sm text-destructive flex items-center gap-1">
                <AlertTriangle size={14} /> {error}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="text-xs text-muted-foreground mb-2">
              {date} • {shift} shift • {parsedDowntimes.filter(d => d.valid).length} valid downtimes
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineMatches.map(match => {
                    const collapsed = collapsedLines.has(match.line);
                    const dupeCount = match.downtimes.filter(d => d.valid).length - match.newDowntimes.length;
                    return (
                      <Fragment key={match.line}>
                        <TableRow
                          className="bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => toggleLine(match.line)}
                        >
                          <TableCell colSpan={5}>
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              {match.sessionId ? (
                                <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                              ) : (
                                <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
                              )}
                              <span className="text-primary">{match.line}</span>
                              <span className="text-muted-foreground font-normal text-xs">
                                {match.newDowntimes.length} new
                                {dupeCount > 0 && `, ${dupeCount} duplicate${dupeCount !== 1 ? 's' : ''} skipped`}
                              </span>
                              {!match.sessionId && (
                                <span className="text-yellow-600 text-xs font-normal ml-auto">No session found</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {!collapsed && match.downtimes.map((dt, i) => {
                          const isDupe = dt.valid && !match.newDowntimes.includes(dt);
                          return (
                            <TableRow key={`${match.line}-${i}`} className={isDupe ? 'opacity-40 line-through' : dt.valid ? '' : 'opacity-50'}>
                              <TableCell>
                                {dt.valid && !isDupe ? (
                                  <CheckCircle2 size={14} className="text-green-600" />
                                ) : (
                                  <span title={isDupe ? 'Duplicate' : dt.error}>
                                    <AlertTriangle size={14} className={isDupe ? 'text-muted-foreground' : 'text-destructive'} />
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{dt.category}</TableCell>
                              <TableCell className="text-sm">{dt.reason}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{formatDuration(dt.duration)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{dt.comment}</TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {unmatchedLines.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-700 dark:text-yellow-400">
                <AlertTriangle size={12} className="inline mr-1" />
                {unmatchedLines.length} line{unmatchedLines.length !== 1 ? 's' : ''} without matching session — downtimes will be skipped.
              </div>
            )}

            <DialogFooter className="pt-3 gap-2">
              <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button
                onClick={handleConfirm}
                disabled={submitting || totalNew === 0}
              >
                {submitting ? <><Loader2 size={14} className="animate-spin mr-1" />Importing...</> : `Import ${totalNew} Downtimes`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
