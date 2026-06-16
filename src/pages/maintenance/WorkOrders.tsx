import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useWorkOrders, WoStatus } from '@/hooks/useWorkOrders';
import { Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const STATUS_LABELS: Record<WoStatus, string> = {
  open: 'Open',
  received: 'Received',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  finished: 'Finished',
  completed: 'Completed',
  closed: 'Closed',
  force_closed: 'Force Closed',
};

const STATUS_CLASSES: Record<WoStatus, string> = {
  open: 'bg-red-100 text-red-800',
  received: 'bg-amber-100 text-amber-800',
  arrived: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  finished: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-muted text-muted-foreground',
  force_closed: 'bg-muted text-muted-foreground',
};

const OPEN_STATUSES: WoStatus[] = ['open', 'received', 'arrived', 'in_progress'];

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function WorkOrders() {
  const { workOrders, isLoading, error, openCount, linesStoppedCount } = useWorkOrders();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | WoStatus>('OPEN');

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return workOrders;
    if (statusFilter === 'OPEN') return workOrders.filter(wo => OPEN_STATUSES.includes(wo.status));
    return workOrders.filter(wo => wo.status === statusFilter);
  }, [workOrders, statusFilter]);

  return (
    <>
      <Header
        title="Work Orders"
        subtitle="Maintenance tickets raised from production lines"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><AlertTriangle size={18} className="text-red-700" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Open Tickets</p>
              <p className="text-xl font-bold text-foreground">{openCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Clock size={18} className="text-amber-700" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Lines Stopped</p>
              <p className="text-xl font-bold text-foreground">{linesStoppedCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100"><CheckCircle2 size={18} className="text-emerald-700" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total (last 200)</p>
              <p className="text-xl font-bold text-foreground">{workOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="input-field">
                <option value="OPEN">Open (all active)</option>
                <option value="ALL">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredOrders.length} ticket{filteredOrders.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading work orders...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive text-sm">{error}</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 size={32} className="text-success" />
              No work orders for this filter
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Line</th>
                    <th className="py-2 pr-3">Machine</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Requester</th>
                    <th className="py-2 pr-3">Engineer</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-muted/50">
                      <td className="py-2 pr-3 font-medium text-foreground">#{wo.wo_number}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_CLASSES[wo.status]}`}>{STATUS_LABELS[wo.status]}</span>
                      </td>
                      <td className="py-2 pr-3">{wo.line_at_time || '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{wo.machine || '—'}</td>
                      <td className="py-2 pr-3 max-w-xs truncate" title={wo.description}>{wo.description}</td>
                      <td className="py-2 pr-3">{wo.requester_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{wo.engineer_name || '—'}</td>
                      <td className="py-2 pr-3 capitalize">{wo.priority}</td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDateTime(wo.created_at)}</td>
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
