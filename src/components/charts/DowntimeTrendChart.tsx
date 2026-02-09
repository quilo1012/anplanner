import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProductionSession } from '@/types/production';
import { Clock } from 'lucide-react';

interface DowntimeTrendChartProps {
  sessions: ProductionSession[];
}

export function DowntimeTrendChart({ sessions }: DowntimeTrendChartProps) {
  const chartData = useMemo(() => {
    const byDate: Record<string, { day: number; night: number }> = {};
    sessions.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = { day: 0, night: 0 };
      const shiftKey = s.shift.toLowerCase() as 'day' | 'night';
      byDate[s.date][shiftKey] += s.totalDowntime;
    });
    return Object.entries(byDate).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, data]) => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), day: data.day || 0, night: data.night || 0 }));
  }, [sessions]);

  if (chartData.length === 0) return <div className="h-64 flex flex-col items-center justify-center text-muted-foreground"><Clock size={32} className="mb-2 opacity-50" /><p className="text-sm">No downtime data available</p></div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(value) => `${value}m`} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${value} min`, '']} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="day" name="DAY" stroke="hsl(220, 70%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(220, 70%, 50%)', strokeWidth: 2 }} connectNulls />
          <Line type="monotone" dataKey="night" name="NIGHT" stroke="hsl(280, 65%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(280, 65%, 50%)', strokeWidth: 2 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
