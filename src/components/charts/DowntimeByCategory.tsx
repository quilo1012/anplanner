import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';
import { ShiftReport } from '@/types/shift';
import { DOWNTIME_CATEGORIES, DowntimeCategory } from '@/types/downtime';

interface DowntimeByCategoryProps {
  shifts: ShiftReport[];
}

const CATEGORY_COLORS: Record<DowntimeCategory, string> = {
  maintenance: 'hsl(var(--industrial-blue))',
  quality: 'hsl(var(--industrial-cyan))',
  health_safety: 'hsl(var(--industrial-orange))',
  warehouse: 'hsl(var(--industrial-purple))',
  staff: 'hsl(var(--industrial-green))',
  other: 'hsl(var(--muted-foreground))',
};

export function DowntimeByCategory({ shifts }: DowntimeByCategoryProps) {
  const data = useMemo(() => {
    const categoryTotals: Record<DowntimeCategory, number> = {
      maintenance: 0,
      quality: 0,
      health_safety: 0,
      warehouse: 0,
      staff: 0,
      other: 0,
    };

    shifts.forEach(shift => {
      if (shift.structuredDowntimes && shift.structuredDowntimes.length > 0) {
        shift.structuredDowntimes.forEach(dt => {
          const cat = dt.category as DowntimeCategory;
          if (categoryTotals[cat] !== undefined) {
            categoryTotals[cat] += dt.duration;
          }
        });
      }
    });

    return DOWNTIME_CATEGORIES.map(cat => ({
      name: cat.label,
      category: cat.value,
      minutes: categoryTotals[cat.value],
      color: CATEGORY_COLORS[cat.value],
    })).filter(d => d.minutes > 0);
  }, [shifts]);

  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock size={32} className="text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No downtime data</p>
        <p className="text-xs text-muted-foreground">for selected filters</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          type="number" 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickFormatter={(val) => `${val}m`}
        />
        <YAxis 
          dataKey="name" 
          type="category" 
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
          width={75}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value} min`, 'Duration']}
        />
        <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
