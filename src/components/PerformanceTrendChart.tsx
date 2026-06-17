import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ProductionSession } from '@/types/production';

interface PerformanceTrendChartProps {
  sessions: ProductionSession[];
}

export function PerformanceTrendChart({ sessions }: PerformanceTrendChartProps) {
  const chartData = useMemo(() => {
    const byDate: Record<string, number[]> = {};
    sessions.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s.performance);
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, arr]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        performance: arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
      }));
  }, [sessions]);

  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available for trend analysis</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number | null) => value !== null ? [`${value}%`, 'Performance'] : ['N/A', '']} />
          <ReferenceLine y={95} stroke="hsl(145, 65%, 42%)" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="performance" name="Performance" stroke="hsl(200, 80%, 55%)" strokeWidth={2} dot={{ fill: 'hsl(200, 80%, 55%)', strokeWidth: 2 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
