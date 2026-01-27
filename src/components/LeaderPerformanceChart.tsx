import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ShiftReport } from '@/types/shift';

interface LeaderPerformanceChartProps {
  shifts: ShiftReport[];
}

export function LeaderPerformanceChart({ shifts }: LeaderPerformanceChartProps) {
  const chartData = useMemo(() => {
    const byLeader: Record<string, ShiftReport[]> = {};
    
    shifts.forEach(s => {
      if (!s.lineLeader) return;
      if (!byLeader[s.lineLeader]) {
        byLeader[s.lineLeader] = [];
      }
      byLeader[s.lineLeader].push(s);
    });

    return Object.entries(byLeader)
      .map(([leader, leaderShifts]) => ({
        name: leader.length > 12 ? leader.substring(0, 12) + '...' : leader,
        fullName: leader,
        performance: Math.round(
          (leaderShifts.reduce((sum, s) => sum + s.performance, 0) / leaderShifts.length) * 10
        ) / 10,
        shifts: leaderShifts.length,
      }))
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 8); // Top 8 leaders
  }, [shifts]);

  const getBarColor = (performance: number) => {
    if (performance >= 90) return 'hsl(145, 65%, 42%)';
    if (performance >= 75) return 'hsl(40, 95%, 50%)';
    return 'hsl(0, 75%, 55%)';
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
        No leader data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
          <XAxis 
            type="number"
            domain={[0, 100]}
            tick={{ fill: 'hsl(220, 10%, 45%)', fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            type="category"
            dataKey="name"
            tick={{ fill: 'hsl(220, 10%, 45%)', fontSize: 11 }}
            width={70}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 15%, 88%)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value}% (${props.payload.shifts} shifts)`, 
              props.payload.fullName
            ]}
          />
          <ReferenceLine 
            x={95} 
            stroke="hsl(145, 65%, 42%)" 
            strokeDasharray="5 5"
          />
          <Bar 
            dataKey="performance" 
            radius={[0, 4, 4, 0]}
            maxBarSize={30}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.performance)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
