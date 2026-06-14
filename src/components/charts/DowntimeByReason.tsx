import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { ProductionSession } from '@/types/production';
import { DOWNTIME_REASONS_BY_CATEGORY } from '@/types/downtime';

interface DowntimeByReasonProps {
  sessions: ProductionSession[];
  filterCategory?: string;
  filterReason?: string;
}

function getReasonLabel(category: string, reasonCode: string): string {
  const reasons = DOWNTIME_REASONS_BY_CATEGORY[category];
  if (!reasons) return reasonCode;
  const found = reasons.find(r => r.value === reasonCode);
  return found ? found.label : reasonCode;
}

export function DowntimeByReason({ sessions, filterCategory, filterReason }: DowntimeByReasonProps) {
  const data = useMemo(() => {
    const reasonTotals: Record<string, { label: string; minutes: number }> = {};
    sessions.forEach(s => {
      if (s.structuredDowntimes) {
        s.structuredDowntimes.forEach(dt => {
          if (filterCategory && dt.category !== filterCategory) return;
          if (filterReason && dt.reason !== filterReason) return;
          const key = `${dt.category}:${dt.reason}`;
          const label = getReasonLabel(dt.category, dt.reason);
          if (!reasonTotals[key]) reasonTotals[key] = { label, minutes: 0 };
          reasonTotals[key].minutes += dt.duration;
        });
      }
    });
    return Object.values(reasonTotals).filter(d => d.minutes > 0).sort((a, b) => b.minutes - a.minutes).slice(0, 10)
      .map(d => ({ name: d.label.length > 15 ? d.label.slice(0, 15) + '…' : d.label, fullName: d.label, minutes: d.minutes }));
  }, [sessions]);

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertTriangle size={32} className="text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">No downtime data</p>
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 90, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(val) => `${val}m`} />
        <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} width={85} />
        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
          formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [`${value} min`, props.payload.fullName]} />
        <Bar dataKey="minutes" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
