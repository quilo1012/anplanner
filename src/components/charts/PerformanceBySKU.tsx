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

interface PerformanceBySKUProps {
  shifts: ShiftReport[];
}

export function PerformanceBySKU({ shifts }: PerformanceBySKUProps) {
  const chartData = useMemo(() => {
    const bySku: Record<string, number> = {};
    
    shifts.forEach(s => {
      if (s.sku) {
        bySku[s.sku] = (bySku[s.sku] || 0) + s.realProduction;
      }
    });

    return Object.entries(bySku)
      .map(([sku, total]) => ({ sku, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 SKUs
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
          layout="vertical"
          margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            type="number"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis 
            dataKey="sku" 
            type="category"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            width={75}
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
            fill="hsl(var(--primary))" 
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
