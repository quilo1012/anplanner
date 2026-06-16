import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useWorkOrders, WoStatus, nextStatus, WorkOrder } from '@/hooks/useWorkOrders';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, CheckCircle2, Clock, Plus, ArrowRight, X } from 'lucide-react';

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

interface LineRow { id: string; name: string }

export function WorkOrders() {
  const { user, hasRole } = useAuth();
  const { workOrders, isLoading, error, openCount, linesStoppedCount, createWorkOrder, advanceWorkOrder } = useWorkOrders();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | WoStatus>('OPEN');
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const canCreate = hasRole(['supervisor', 'admin']);
  const canAdvance = hasRole(['engineer', 'admin']);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return workOrders;
    if (statusFilter === 'OPEN') return workOrders.filter(wo => OPEN_STATUSES.includes(wo.status));
    return workOrders.filter(wo => wo.status === statusFilter);
  }, [workOrders, statusFilter]);

  const handleAdvance = async (wo: WorkOrder) => {
    setBusy(wo.id);
    const next = nextStatus(wo.status);
    const result = next === 'received'
      ? await advanceWorkOrder(wo, user?.id, user?.name)
      : await advanceWorkOrder(wo);
    setBusy(null);
    if (!result.success) alert(result.error || 'Failed to advance work order');
  };

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
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filteredOrders.length} ticket{filteredOrders.length !== 1 ? 's' : ''}
              </span>
              {canCreate && (
                <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5">
                  <Plus size={16} /> New Work Order
                </button>
              )}
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
                    {canAdvance && <th className="py-2 pr-3">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map(wo => {
                    const next = nextStatus(wo.status);
                    return (
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
                        {canAdvance && (
                          <td className="py-2 pr-3">
                            {next ? (
                              <button
                                disabled={busy === wo.id}
                                onClick={() => handleAdvance(wo)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                              >
                                {busy === wo.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                                {STATUS_LABELS[next]}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNew && canCreate && user && (
        <NewWorkOrderModal
          onClose={() => setShowNew(false)}
          onCreate={async (input) => {
            const res = await createWorkOrder({ ...input, requesterName: user.name, operatorId: user.id });
            if (res.success) setShowNew(false);
            return res;
          }}
        />
      )}
    </>
  );
}

interface NewWorkOrderModalProps {
  onClose: () => void;
  onCreate: (input: { description: string; lineId: string; lineName: string; machine?: string; priority: string }) => Promise<{ success: boolean; error?: string }>;
}

function NewWorkOrderModal({ onClose, onCreate }: NewWorkOrderModalProps) {
  const [lines, setLines] = useState<LineRow[]>([]);
  const [lineId, setLineId] = useState('');
  const [description, setDescription] = useState('');
  const [machine, setMachine] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lines').select('id, name').order('name');
      if (data) setLines(data as LineRow[]);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !lineId) return;
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    setSubmitting(true);
    setErr(null);
    const res = await onCreate({ description: description.trim(), lineId, lineName: line.name, machine: machine.trim() || undefined, priority });
    setSubmitting(false);
    if (!res.success) setErr(res.error || 'Failed to create');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">New Work Order</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Line *</label>
            <select value={lineId} onChange={e => setLineId(e.target.value)} required className="input-field w-full">
              <option value="">Select line...</option>
              {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} className="input-field w-full" placeholder="Describe the issue..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Machine (optional)</label>
            <input value={machine} onChange={e => setMachine(e.target.value)} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field w-full">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary inline-flex items-center gap-1.5">
              {submitting && <Loader2 size={14} className="animate-spin" />} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
