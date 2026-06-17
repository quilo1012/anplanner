import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useMachines } from '@/hooks/useMachines';
import { Loader2, Cog, HeartPulse } from 'lucide-react';

function healthClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-amber-600';
  return 'text-destructive';
}

export function Machines() {
  const { machines, isLoading, error } = useMachines();
  const [lineFilter, setLineFilter] = useState('ALL');

  const lines = useMemo(
    () => Array.from(new Set(machines.map(m => m.line_name).filter(Boolean))) as string[],
    [machines]
  );

  const filteredMachines = useMemo(
    () => lineFilter === 'ALL' ? machines : machines.filter(m => m.line_name === lineFilter),
    [machines, lineFilter]
  );

  return (
    <>
      <Header
        title="Machines"
        subtitle="Equipment tracked by the maintenance system"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="card p-4 sm:p-6">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Line</label>
              <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} className="input-field">
                <option value="ALL">All lines</option>
                {lines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading machines...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive text-sm">{error}</div>
          ) : filteredMachines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No machines found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Line</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMachines.map(m => (
                    <tr key={m.id} className="hover:bg-muted/50">
                      <td className="py-2 pr-3 font-medium text-foreground flex items-center gap-2">
                        <Cog size={14} className="text-muted-foreground" /> {m.name}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{m.machine_type}</td>
                      <td className="py-2 pr-3">{m.line_name || '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{m.current_location || '—'}</td>
                      <td className="py-2 pr-3 capitalize">{m.status || '—'}</td>
                      <td className={`py-2 pr-3 font-medium flex items-center gap-1 ${healthClass(m.health_score)}`}>
                        <HeartPulse size={14} /> {m.health_score}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Machines;
