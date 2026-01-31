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
import { ShiftReport, ShiftType, SHIFT_TYPES } from '@/types/shift';

interface PerformanceChartProps {
  shifts: ShiftReport[];
}

export function PerformanceChart({ shifts }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    const byShift: Record<ShiftType, ShiftReport[]> = { DAY: [], NIGHT: [] };
    
    shifts.forEach(s => {
      if (byShift[s.shift]) {
        byShift[s.shift].push(s);
      }
    });

    return SHIFT_TYPES.map(shift => {
      const shiftData = byShift[shift];
      const avgPerformance = shiftData.length > 0
        ? shiftData.reduce((sum, s) => sum + s.performance, 0) / shiftData.length
        : 0;
      
      return {
        name: shift,
        performance: Math.round(avgPerformance * 10) / 10,
        shifts: shiftData.length,
      };
    });
  }, [shifts]);

  const getBarColor = (performance: number) => {
    if (performance >= 90) return 'hsl(145, 65%, 42%)';
    if (performance >= 75) return 'hsl(40, 95%, 50%)';
    return 'hsl(0, 75%, 55%)';
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value}%`, 'Performance']}
          />
          <ReferenceLine 
            y={95} 
            stroke="hsl(145, 65%, 42%)" 
            strokeDasharray="5 5" 
            label={{ value: 'Target 95%', position: 'right', fill: 'hsl(145, 65%, 42%)', fontSize: 11 }} 
          />
          <Bar 
            dataKey="performance" 
            radius={[8, 8, 0, 0]}
            maxBarSize={80}
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
