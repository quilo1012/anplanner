import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProductionSession } from '@/types/production';

interface DailyProductionSummaryProps {
  sessions: ProductionSession[];
}

export function DailyProductionSummary({ sessions }: DailyProductionSummaryProps) {
  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {};
    sessions.forEach(s => { if (s.date) byDate[s.date] = (byDate[s.date] || 0) + s.totalProduction; });
    return Object.entries(byDate)
      .map(([date, total]) => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), rawDate: date, total }))
      .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
      .slice(-14);
  }, [sessions]);

  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No production data for selected filters</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
            formatter={(value: number) => [value.toLocaleString(), 'Units']} />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
