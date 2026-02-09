import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { ProductionSession } from '@/types/production';

interface PerformanceTrendChartProps {
  sessions: ProductionSession[];
}

export function PerformanceTrendChart({ sessions }: PerformanceTrendChartProps) {
  const chartData = useMemo(() => {
    const byDate: Record<string, { day: number[]; night: number[] }> = {};
    sessions.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = { day: [], night: [] };
      const shiftKey = s.shift.toLowerCase() as 'day' | 'night';
      if (byDate[s.date][shiftKey]) byDate[s.date][shiftKey].push(s.performance);
    });
    return Object.entries(byDate).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).slice(-7)
      .map(([date, data]) => {
        const calcAvg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;
        return { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), day: calcAvg(data.day), night: calcAvg(data.night) };
      });
  }, [sessions]);

  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available for trend analysis</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number | null) => value !== null ? [`${value}%`, ''] : ['N/A', '']} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={95} stroke="hsl(145, 65%, 42%)" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="day" name="DAY" stroke="hsl(220, 70%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(220, 70%, 50%)', strokeWidth: 2 }} connectNulls />
          <Line type="monotone" dataKey="night" name="NIGHT" stroke="hsl(280, 65%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(280, 65%, 50%)', strokeWidth: 2 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
