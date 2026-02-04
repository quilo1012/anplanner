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

// Clean SKU data to extract code and product name
const cleanSkuData = (rawSku: string): { code: string; name: string } => {
  if (!rawSku) return { code: '-', name: '' };
  
  // Format: "CODE;DESCRIPTION     [HS CODE:XXXXX];;"
  const parts = rawSku.split(';');
  const code = parts[0]?.trim() || rawSku;
  
  // Extract name without HS CODE
  let name = parts[1] || '';
  name = name.replace(/\s*\[HS CODE:[^\]]+\]/gi, '').trim();
  
  return { code, name };
};

// Custom tooltip component
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { code: string; name: string; total: number } }> }) => {
  if (!active || !payload?.[0]) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-sm text-foreground">{data.code}</p>
      {data.name && (
        <p className="text-xs text-muted-foreground mt-0.5">{data.name}</p>
      )}
      <p className="text-sm mt-2 text-foreground">
        <span className="font-medium">{data.total.toLocaleString()}</span> units
      </p>
    </div>
  );
};

export function PerformanceBySKU({ shifts }: PerformanceBySKUProps) {
  const chartData = useMemo(() => {
    const bySku: Record<string, { code: string; name: string; total: number }> = {};
    
    shifts.forEach(s => {
      if (s.sku) {
        const { code, name } = cleanSkuData(s.sku);
        if (!bySku[code]) {
          bySku[code] = { code, name, total: 0 };
        }
        bySku[code].total += s.realProduction;
      }
    });

    return Object.values(bySku)
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
            tickFormatter={(value) => value.toLocaleString()}
          />
          <YAxis 
            dataKey="code" 
            type="category"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
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
