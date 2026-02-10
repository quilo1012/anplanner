import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, subWeeks, addWeeks, getISOWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Printer, CalendarDays, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const PRODUCTION_LINES = [
  'Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5',
  'Line 6', 'Line 7', 'Line 8', 'Line 9', 'Line 10',
];

interface WeeklyDay {
  date: string;
  day_name: string;
  shift: string;
  planned: number;
  actual: number;
  performance: number | null;
  downtime_minutes: number;
}

interface WeeklyData {
  line: string;
  week_start: string;
  days: WeeklyDay[];
  totals: {
    planned: number;
    actual: number;
    performance: number | null;
    downtime_minutes: number;
  };
}

function getMonday(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

function formatDowntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function perfColor(perf: number | null): string {
  if (perf === null) return 'bg-muted text-muted-foreground';
  if (perf >= 100) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (perf >= 90) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

export function WeeklyReport() {
  const { user, hasRole } = useAuth();
  const isOperator = user?.role === 'operator';

  const [selectedLine, setSelectedLine] = useState<string>(PRODUCTION_LINES[0]);
  const [weekDate, setWeekDate] = useState<Date>(() => getMonday(new Date()));
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');

  const weekStart = format(weekDate, 'yyyy-MM-dd');
  const weekEnd = format(addDays(weekDate, 6), 'yyyy-MM-dd');
  const weekNum = getISOWeek(weekDate);

  const weekLabel = `Week ${weekNum}: ${format(weekDate, 'dd MMM')} – ${format(addDays(weekDate, 6), 'dd MMM yyyy')}`;

  const { data, isLoading, error } = useQuery<WeeklyData>({
    queryKey: ['weekly-report', selectedLine, weekStart, shiftFilter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('weekly-report', {
        method: 'POST',
        body: { line: selectedLine, week_start: weekStart, shift: shiftFilter },
      });

      if (res.error) throw new Error(res.error.message || 'Failed to fetch report');
      return res.data as WeeklyData;
    },
    staleTime: 30_000,
  });

  const prevWeek = useCallback(() => setWeekDate(w => subWeeks(w, 1)), []);
  const nextWeek = useCallback(() => setWeekDate(w => addWeeks(w, 1)), []);

  const handlePrint = useCallback(() => {
    const rows = data?.days || [];
    const totals = data?.totals;
    const now = format(new Date(), 'dd/MM/yyyy HH:mm');

    const rowsHtml = rows.map(r => `
      <tr>
        <td>${r.day_name} ${r.date.slice(8)}</td>
        <td>${r.shift}</td>
        <td style="text-align:right">${r.planned.toLocaleString()}</td>
        <td style="text-align:right">${r.actual.toLocaleString()}</td>
        <td style="text-align:right">${r.performance !== null ? r.performance.toFixed(1) + '%' : '—'}</td>
        <td style="text-align:right">${formatDowntime(r.downtime_minutes)}</td>
      </tr>
    `).join('');

    const totalsHtml = totals ? `
      <tr style="font-weight:bold;border-top:2px solid #000">
        <td colspan="2">WEEK TOTAL</td>
        <td style="text-align:right">${totals.planned.toLocaleString()}</td>
        <td style="text-align:right">${totals.actual.toLocaleString()}</td>
        <td style="text-align:right">${totals.performance !== null ? totals.performance.toFixed(1) + '%' : '—'}</td>
        <td style="text-align:right">${formatDowntime(totals.downtime_minutes)}</td>
      </tr>
    ` : '';

    const html = `<!DOCTYPE html><html><head><title>Weekly Report</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;color:#000}
        h1{font-size:18px;margin:0}
        .meta{font-size:12px;color:#555;margin:4px 0 16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #ccc;padding:6px 10px}
        th{background:#f5f5f5;text-align:left}
      </style>
    </head><body>
      <h1>Weekly Production Report – ${selectedLine}</h1>
      <div class="meta">${weekLabel} | Shift: ${shiftFilter} | Generated: ${now}</div>
      <table>
        <thead><tr><th>Day</th><th>Shift</th><th style="text-align:right">Planned</th><th style="text-align:right">Actual</th><th style="text-align:right">Performance</th><th style="text-align:right">Downtime</th></tr></thead>
        <tbody>${rowsHtml}${totalsHtml}</tbody>
      </table>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }, [data, selectedLine, weekLabel, shiftFilter]);

  const handleExportCsv = useCallback(() => {
    const rows = data?.days || [];
    const totals = data?.totals;
    if (!rows.length) return;

    const headers = ['Day', 'Shift', 'Planned', 'Actual', 'Performance (%)', 'Downtime'];
    const csvRows = rows.map(r => [
      `${r.day_name} ${r.date.slice(8)}`,
      r.shift,
      r.planned.toString(),
      r.actual.toString(),
      r.performance !== null ? r.performance.toFixed(1) : '',
      formatDowntime(r.downtime_minutes),
    ].map(c => `"${c.replace(/"/g, '""')}"`).join(','));

    if (totals) {
      csvRows.push([
        'WEEK TOTAL', '',
        totals.planned.toString(),
        totals.actual.toString(),
        totals.performance !== null ? totals.performance.toFixed(1) : '',
        formatDowntime(totals.downtime_minutes),
      ].map(c => `"${c.replace(/"/g, '""')}"`).join(','));
    }

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const lineSafe = selectedLine.replace(/\s+/g, '_');
    link.download = `Weekly_Report_${lineSafe}_${weekStart}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, selectedLine, weekStart]);

  if (error) {
    toast.error('Failed to load weekly report');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Production Report</h1>
          <p className="text-sm text-muted-foreground">Read-only summary per line, per week</p>
        </div>
        <Button variant="outline" onClick={handlePrint} disabled={!data?.days?.length} className="no-print">
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Line */}
            <div className="w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Production Line</label>
              <Select value={selectedLine} onValueChange={setSelectedLine}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCTION_LINES.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Week Navigator */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Week</label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={prevWeek} className="h-9 w-9">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background min-w-[220px] justify-center">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{weekLabel}</span>
                </div>
                <Button variant="outline" size="icon" onClick={nextWeek} className="h-9 w-9">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Shift */}
            <div className="w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Shift</label>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Shifts</SelectItem>
                  <SelectItem value="DAY">Day</SelectItem>
                  <SelectItem value="NIGHT">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {selectedLine} — {weekLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">Loading report…</div>
          ) : !data?.days?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No data for this week</p>
              <p className="text-sm">No production sessions found for the selected filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Day</TableHead>
                  <TableHead className="w-[80px]">Shift</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                  <TableHead className="text-right">Downtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.days.map((row, i) => (
                  <TableRow key={`${row.date}-${row.shift}-${i}`}>
                    <TableCell className="font-medium">{row.day_name} {row.date.slice(8)}</TableCell>
                    <TableCell>{row.shift}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.planned.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.actual.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${perfColor(row.performance)}`}>
                        {row.performance !== null ? `${row.performance.toFixed(1)}%` : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatDowntime(row.downtime_minutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell colSpan={2}>WEEK TOTAL</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.planned.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.actual.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${perfColor(data.totals.performance)}`}>
                      {data.totals.performance !== null ? `${data.totals.performance.toFixed(1)}%` : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatDowntime(data.totals.downtime_minutes)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
