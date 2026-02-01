import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ShiftReport } from '@/types/shift';

interface PerformanceByLineProps {
  shifts: ShiftReport[];
}

export function PerformanceByLine({ shifts }: PerformanceByLineProps) {
  const chartData = useMemo(() => {
    // Aggregate ALL products from the same line
    const byLine: Record<string, { 
      production: number; 
      downtime: number; 
      target: number;
      skuCount: number;
    }> = {};
    
    shifts.forEach(s => {
      if (s.productionLine) {
        if (!byLine[s.productionLine]) {
          byLine[s.productionLine] = { production: 0, downtime: 0, target: 0, skuCount: 0 };
        }
        byLine[s.productionLine].production += s.realProduction;
        byLine[s.productionLine].target += s.productionTarget;
        byLine[s.productionLine].downtime += s.totalDowntime;
        byLine[s.productionLine].skuCount += 1;
      }
    });

    return Object.entries(byLine)
      .map(([line, data]) => ({ 
        line, 
        production: data.production,
        target: data.target,
        downtime: data.downtime,
        skuCount: data.skuCount,
        performance: data.target > 0 ? Math.round((data.production / data.target) * 100) : 0,
      }))
      .sort((a, b) => b.production - a.production);
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
            dataKey="line" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
            formatter={(value: number, name: string) => {
              if (name === 'Production') return [value.toLocaleString(), 'Production'];
              if (name === 'Downtime (min)') return [value, 'Downtime (min)'];
              return [value, name];
            }}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.line === label);
              return `${label} (${item?.skuCount || 0} products)`;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar 
            dataKey="production" 
            name="Production"
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="downtime" 
            name="Downtime (min)"
            fill="hsl(var(--destructive))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
