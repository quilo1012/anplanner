import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';
import { ProductionSession } from '@/types/production';
import { DOWNTIME_CATEGORIES, DowntimeCategory } from '@/types/downtime';

interface DowntimeByCategoryProps {
  sessions: ProductionSession[];
}

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: 'hsl(var(--industrial-blue))', quality: 'hsl(var(--industrial-cyan))',
  health_safety: 'hsl(var(--industrial-orange))', warehouse: 'hsl(var(--industrial-purple))',
  staff: 'hsl(var(--industrial-green))', other: 'hsl(var(--muted-foreground))',
};

export function DowntimeByCategory({ sessions }: DowntimeByCategoryProps) {
  const data = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.structuredDowntimes) {
        s.structuredDowntimes.forEach(dt => {
          categoryTotals[dt.category] = (categoryTotals[dt.category] || 0) + dt.duration;
        });
      }
    });
    return Object.entries(categoryTotals)
      .filter(([_, mins]) => mins > 0)
      .map(([cat, minutes]) => ({
        name: DOWNTIME_CATEGORIES.find(c => c.value === cat)?.label || cat,
        category: cat, minutes, color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.other,
      }));
  }, [sessions]);

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Clock size={32} className="text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">No downtime data</p>
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(val) => `${val}m`} />
        <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} width={75} />
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
          formatter={(value: number) => [`${value} min`, 'Duration']} />
        <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
