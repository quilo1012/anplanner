import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProductionSession } from '@/types/production';

interface PerformanceByLeaderProps {
  sessions: ProductionSession[];
}

export function PerformanceByLeader({ sessions }: PerformanceByLeaderProps) {
  const chartData = useMemo(() => {
    const byLeader: Record<string, { production: number; target: number; lineCount: number; skuCount: number }> = {};
    const leaderLines: Record<string, Set<string>> = {};
    sessions.forEach(s => {
      if (!byLeader[s.lineLeader]) { byLeader[s.lineLeader] = { production: 0, target: 0, lineCount: 0, skuCount: 0 }; leaderLines[s.lineLeader] = new Set(); }
      byLeader[s.lineLeader].production += s.totalProduction;
      byLeader[s.lineLeader].target += s.plannedQuantity;
      byLeader[s.lineLeader].skuCount += s.items.length;
      leaderLines[s.lineLeader].add(s.productionLine);
    });
    Object.keys(byLeader).forEach(l => { byLeader[l].lineCount = leaderLines[l]?.size || 0; });
    return Object.entries(byLeader).map(([leader, data]) => ({
      leader, total: data.production, target: data.target, lineCount: data.lineCount, skuCount: data.skuCount,
      performance: data.target > 0 ? Math.round((data.production / data.target) * 100) : 0,
    })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [sessions]);

  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No production data for selected filters</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="leader" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
            formatter={(value: number) => [value.toLocaleString(), 'Units Produced']}
            labelFormatter={(label) => { const item = chartData.find(d => d.leader === label); return `${label} - ${item?.lineCount || 0} lines, ${item?.skuCount || 0} products`; }} />
          <Bar dataKey="total" fill="hsl(145, 65%, 42%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
