import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ShiftReport } from '@/types/shift';

interface PerformanceByLeaderProps {
  shifts: ShiftReport[];
}

export function PerformanceByLeader({ shifts }: PerformanceByLeaderProps) {
  const chartData = useMemo(() => {
    const byLeader: Record<string, number> = {};
    
    shifts.forEach(s => {
      if (s.lineLeader) {
        byLeader[s.lineLeader] = (byLeader[s.lineLeader] || 0) + s.realProduction;
      }
    });

    return Object.entries(byLeader)
      .map(([leader, total]) => ({ leader, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 leaders
  }, [shifts]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No production data for selected filters
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="leader" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [value.toLocaleString(), 'Units']}
          />
          <Bar 
            dataKey="total" 
            fill="hsl(145, 65%, 42%)" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
