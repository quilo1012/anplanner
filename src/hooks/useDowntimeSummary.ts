import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  maintenance: 'Maintenance',
  quality: 'Quality',
  health_safety: 'Health & Safety',
  warehouse: 'Warehouse',
  staff: 'Staff',
  other: 'Other',
};

export { CATEGORY_LABELS };

interface RawDowntimeRow {
  category: string;
  reason: string;
  duration: number;
  session_id: string;
}

interface RawSessionRow {
  id: string;
  production_line: string;
  date: string;
}

export interface LineSummary {
  line: string;
  totalMinutes: number;
  eventCount: number;
  topReasons: { reason: string; count: number }[];
}

export interface CategorySummary {
  category: string;
  label: string;
  totalMinutes: number;
  percent: number;
}

export interface DowntimeSummaryReport {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  previousWeekTotalMinutes: number;
  changeMinutes: number;
  changePercent: number | null;
  byLine: LineSummary[];
  byCategory: CategorySummary[];
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start of week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchWeekTotal(weekStartStr: string, weekEndStr: string): Promise<{ total: number; rows: RawDowntimeRow[] }> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('production_sessions' as never)
    .select('id, production_line, date')
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);
  if (sessionsError) throw sessionsError;

  const sessionRows = (sessions || []) as unknown as RawSessionRow[];
  const sessionIds = sessionRows.map(s => s.id);
  if (sessionIds.length === 0) return { total: 0, rows: [] };

  const { data: downtimes, error: downtimesError } = await supabase
    .from('structured_downtimes' as never)
    .select('category, reason, duration, session_id')
    .in('session_id', sessionIds);
  if (downtimesError) throw downtimesError;

  const rows = (downtimes || []) as unknown as RawDowntimeRow[];
  const total = rows.reduce((sum, r) => sum + (r.duration || 0), 0);
  return { total, rows };
}

/**
 * Fetches and aggregates a week's structured_downtimes (joined through
 * production_sessions by date range) into the shape needed for the
 * "Downtime Summary" weekly report: total vs previous week, breakdown by
 * line with top reasons, and breakdown by category with percentages.
 */
export function useDowntimeSummary(referenceDate: Date) {
  const [report, setReport] = useState<DowntimeSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const weekStart = startOfWeek(referenceDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

      const weekStartStr = formatDate(weekStart);
      const weekEndStr = formatDate(weekEnd);
      const prevWeekStartStr = formatDate(prevWeekStart);
      const prevWeekEndStr = formatDate(prevWeekEnd);

      const [current, previous] = await Promise.all([
        fetchWeekTotal(weekStartStr, weekEndStr),
        fetchWeekTotal(prevWeekStartStr, prevWeekEndStr),
      ]);

      // Need session->line mapping for the current week to build the by-line breakdown.
      const { data: sessions, error: sessionsError } = await supabase
        .from('production_sessions' as never)
        .select('id, production_line, date')
        .gte('date', weekStartStr)
        .lte('date', weekEndStr);
      if (sessionsError) throw sessionsError;
      const sessionRows = (sessions || []) as unknown as RawSessionRow[];
      const sessionToLine = new Map(sessionRows.map(s => [s.id, s.production_line]));

      const byLineMap = new Map<string, { totalMinutes: number; eventCount: number; reasonCounts: Map<string, number> }>();
      const byCategoryMap = new Map<string, number>();

      for (const row of current.rows) {
        const line = sessionToLine.get(row.session_id) || 'Unknown';
        if (!byLineMap.has(line)) byLineMap.set(line, { totalMinutes: 0, eventCount: 0, reasonCounts: new Map() });
        const lineEntry = byLineMap.get(line)!;
        lineEntry.totalMinutes += row.duration || 0;
        lineEntry.eventCount += 1;
        lineEntry.reasonCounts.set(row.reason, (lineEntry.reasonCounts.get(row.reason) || 0) + 1);

        byCategoryMap.set(row.category, (byCategoryMap.get(row.category) || 0) + (row.duration || 0));
      }

      const byLine: LineSummary[] = Array.from(byLineMap.entries())
        .map(([line, entry]) => ({
          line,
          totalMinutes: entry.totalMinutes,
          eventCount: entry.eventCount,
          topReasons: Array.from(entry.reasonCounts.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3),
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

      const byCategory: CategorySummary[] = Array.from(byCategoryMap.entries())
        .map(([category, totalMinutes]) => ({
          category,
          label: CATEGORY_LABELS[category] || category,
          totalMinutes,
          percent: current.total > 0 ? Math.round((totalMinutes / current.total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

      const changeMinutes = current.total - previous.total;
      const changePercent = previous.total > 0 ? Math.round((changeMinutes / previous.total) * 1000) / 10 : null;

      setReport({
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        totalMinutes: current.total,
        previousWeekTotalMinutes: previous.total,
        changeMinutes,
        changePercent,
        byLine,
        byCategory,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [referenceDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, isLoading, error, refreshReport: fetchReport };
}
