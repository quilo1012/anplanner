import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  days?: number;
  excludeLeader?: string;
}

export function QualityTrendChart({ days = 30, excludeLeader }: Props) {
  const [rows, setRows] = useState<{ date: string | null; points: number; line_leader: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    supabase
      .from('quality_actions')
      .select('date, points, line_leader')
      .gte('date', startDate)
      .lte('date', endDate)
      .then(({ data, error }) => {
        if (cancel) return;
        if (!error && data) setRows(data);
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [startDate, endDate]);

  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      byDate[d] = 0;
    }
    for (const r of rows) {
      if (!r.date) continue;
      if (excludeLeader && (r.line_leader || '').trim().toLowerCase() === excludeLeader.trim().toLowerCase()) continue;
      if (byDate[r.date] !== undefined) byDate[r.date] += Number(r.points) || 0;
    }
    return Object.entries(byDate).map(([date, points]) => ({
      date: format(parseISO(date), 'MMM d'),
      points,
    }));
  }, [rows, days, excludeLeader]);

  return (
    <div>
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-3">
        <TrendingDown size={16} className="text-amber-500" /> Quality Penalty Trend ({days}d)
      </h3>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [`-${v} pts`, 'Penalty']} />
              <Line type="monotone" dataKey="points" name="Penalty" stroke="hsl(0, 70%, 55%)" strokeWidth={2} dot={{ fill: 'hsl(0, 70%, 55%)', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
