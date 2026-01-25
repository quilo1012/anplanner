import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { ShiftReport } from '@/types/shift';

interface PerformanceTrendChartProps {
  shifts: ShiftReport[];
}

export function PerformanceTrendChart({ shifts }: PerformanceTrendChartProps) {
  const chartData = useMemo(() => {
    // Group by date and calculate averages
    const byDate: Record<string, { day: number[]; night: number[] }> = {};
    
    shifts.forEach(s => {
      if (!byDate[s.date]) {
        byDate[s.date] = { day: [], night: [] };
      }
      if (s.shift === 'Day') {
        byDate[s.date].day.push(s.performance);
      } else {
        byDate[s.date].night.push(s.performance);
      }
    });

    // Sort by date and get last 7 days
    return Object.entries(byDate)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-7)
      .map(([date, data]) => {
        const dayAvg = data.day.length > 0 
          ? Math.round(data.day.reduce((a, b) => a + b, 0) / data.day.length * 10) / 10 
          : null;
        const nightAvg = data.night.length > 0 
          ? Math.round(data.night.reduce((a, b) => a + b, 0) / data.night.length * 10) / 10 
          : null;
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          day: dayAvg,
          night: nightAvg,
        };
      });
  }, [shifts]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
        No data available for trend analysis
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(220, 10%, 45%)', fontSize: 11 }}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fill: 'hsl(220, 10%, 45%)', fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 15%, 88%)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number | null) => value !== null ? [`${value}%`, ''] : ['N/A', '']}
          />
          <Legend 
            wrapperStyle={{ fontSize: 12 }}
          />
          <ReferenceLine 
            y={95} 
            stroke="hsl(145, 65%, 42%)" 
            strokeDasharray="5 5"
          />
          <Line 
            type="monotone" 
            dataKey="day" 
            name="☀️ Day Shift"
            stroke="hsl(40, 95%, 50%)" 
            strokeWidth={2}
            dot={{ fill: 'hsl(40, 95%, 50%)', strokeWidth: 2 }}
            connectNulls
          />
          <Line 
            type="monotone" 
            dataKey="night" 
            name="🌙 Night Shift"
            stroke="hsl(220, 70%, 50%)" 
            strokeWidth={2}
            dot={{ fill: 'hsl(220, 70%, 50%)', strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
