import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useWorkOrders, WoStatus, nextStatus, WorkOrder } from '@/hooks/useWorkOrders';
import { useWorkOrderDowntimeSummary, useWorkOrderDowntimeEvents } from '@/hooks/useWorkOrderDowntimeSummary';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { formatDuration } from '@/utils/formatDuration';
import { toast } from 'sonner';
import { Loader2, Wrench, AlertTriangle, CheckCircle2, Clock, Plus, ArrowRight, X } from 'lucide-react';

const DOWNTIME_STATUS_CLASSES: Record<'active' | 'resolved' | 'none', string> = {
  active: 'bg-red-100 text-red-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  none: 'bg-muted text-muted-foreground',
};

function WorkOrderDowntimePanel({ wo, onClose }: { wo: WorkOrder; onClose: () => void }) {
  const { events, isLoading } = useWorkOrderDowntimeEvents(wo.id);
  const total = events.reduce((sum, e) => sum + (e.duration_minutes ?? (e.resumed_at ? Math.max(0, Math.round((new Date(e.resumed_at).getTime() - new Date(e.stopped_at).getTime()) / 60000)) : 0)), 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-card border-l border-border w-full max-w-lg h-full overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Work Order</p>
            <h2 className="text-lg font-semibold text-foreground">#{wo.wo_number} — {wo.line_at_time || '—'}</h2>
            <p className="text-sm text-muted-foreground mt-1">{wo.description}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card p-3">
            <p className="text-xs text-muted-foreground">Total downtime</p>
            <p className="text-lg font-bold text-foreground">{total > 0 ? formatDuration(total) : '—'}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-muted-foreground">Events</p>
            <p className="text-lg font-bold text-foreground">{events.length}</p>
          </div>
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Downtime events</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No downtime events for this work order.</p>
        ) : (
          <ul className="space-y-2">
            {events.map(e => {
              const duration = e.duration_minutes ?? (e.resumed_at ? Math.max(0, Math.round((new Date(e.resumed_at).getTime() - new Date(e.stopped_at).getTime()) / 60000)) : null);
              return (
                <li key={e.id} className="border border-border rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">{e.stopped_reason || 'No reason'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${e.resumed_at ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {e.resumed_at ? (duration !== null ? formatDuration(duration) : 'Resolved') : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(e.stopped_at)} → {e.resumed_at ? formatDateTime(e.resumed_at) : 'ongoing'}
                  </p>
                  {(e.stopped_by_name || e.resumed_by_name) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {e.stopped_by_name && <>Stopped by {e.stopped_by_name}</>}
                      {e.stopped_by_name && e.resumed_by_name && ' · '}
                      {e.resumed_by_name && <>Resumed by {e.resumed_by_name}</>}
                    </p>
                  )}
                  {e.resumed_note && <p className="text-xs text-muted-foreground mt-1 italic">"{e.resumed_note}"</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

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

function useLinesList() {
  const [lines, setLines] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase.from('lines' as never).select('id, name').then(({ data }) => {
      const list = (data || []) as unknown as { id: string; name: string }[];
      setLines(list.sort((a, b) => naturalLineSort(a.name, b.name)));
    });
  }, []);
  return lines;
}

function NewWorkOrderForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const { createWorkOrder } = useWorkOrders();
  const lines = useLinesList();
  const [description, setDescription] = useState('');
  const [lineId, setLineId] = useState('');
  const [machine, setMachine] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !lineId) {
      toast.error('Please fill in the line and description.');
      return;
    }
    const lineName = lines.find(l => l.id === lineId)?.name || '';
    setIsSubmitting(true);
    const result = await createWorkOrder({
      description: description.trim(),
      lineId,
      lineName,
      machine: machine.trim() || undefined,
      priority,
      requesterName: user?.name || 'Unknown',
      operatorId: user?.id || '',
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(`Failed to create work order: ${result.error}`);
      return;
    }
    toast.success('Work order created');
    onCreated();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-6 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Plus size={16} /> New Work Order</h3>
        <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Line *</label>
          <select value={lineId} onChange={(e) => setLineId(e.target.value)} className="input-field" required>
            <option value="">Select line...</option>
            {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Machine (optional)</label>
          <input type="text" value={machine} onChange={(e) => setMachine(e.target.value)} className="input-field" placeholder="e.g. Filler, Capper..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Description *</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" rows={3} placeholder="Describe the issue..." required />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Work Order
        </button>
      </div>
    </form>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function WorkOrders() {
  const { workOrders, isLoading, error, openCount, linesStoppedCount, advanceWorkOrder, stopLine, resumeLine, refreshWorkOrders } = useWorkOrders();
  const { byWoId: downtimeByWo } = useWorkOrderDowntimeSummary();
  const { user, hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | WoStatus>('OPEN');
  const [showNewForm, setShowNewForm] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [openPanelWo, setOpenPanelWo] = useState<WorkOrder | null>(null);

  const isEngineer = hasRole('engineer');
  const canCreate = hasRole(['supervisor', 'admin']);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return workOrders;
    if (statusFilter === 'OPEN') return workOrders.filter(wo => OPEN_STATUSES.includes(wo.status));
    return workOrders.filter(wo => wo.status === statusFilter);
  }, [workOrders, statusFilter]);

  const handleAdvance = async (wo: WorkOrder) => {
    setAdvancingId(wo.id);
    const result = wo.status === 'open'
      ? await advanceWorkOrder(wo, user?.id, user?.name)
      : await advanceWorkOrder(wo);
    setAdvancingId(null);
    if (!result.success) {
      toast.error(`Failed to update work order: ${result.error}`);
      return;
    }
    toast.success(`Work order #${wo.wo_number} advanced`);
  };

  const handleStopLine = async (wo: WorkOrder) => {
    setAdvancingId(wo.id);
    const result = await stopLine(wo);
    setAdvancingId(null);
    if (!result.success) {
      toast.error(`Failed to stop line: ${result.error}`);
      return;
    }
    toast.success(`Line stopped for #${wo.wo_number}`);
  };

  const handleResumeLine = async (wo: WorkOrder) => {
    setAdvancingId(wo.id);
    const result = await resumeLine(wo);
    setAdvancingId(null);
    if (!result.success) {
      toast.error(`Failed to resume line: ${result.error}`);
      return;
    }
    toast.success(`Line resumed for #${wo.wo_number} — logged on the shift`);
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

        {showNewForm && <NewWorkOrderForm onClose={() => setShowNewForm(false)} onCreated={refreshWorkOrders} />}

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
              {canCreate && !showNewForm && (
                <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm">
                  <Plus size={14} /> New Work Order
                </button>
              )}
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredOrders.length} ticket{filteredOrders.length !== 1 ? 's' : ''}
              </span>
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
                    <th className="py-2 pr-3 whitespace-nowrap">Downtime</th>
                    <th className="py-2 pr-3">Events</th>
                    <th className="py-2 pr-3">Created</th>
                    {isEngineer && <th className="py-2 pr-3">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map(wo => {
                    const dt = downtimeByWo[wo.id];
                    const status = dt?.downtime_status ?? 'none';
                    return (
                    <tr key={wo.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setOpenPanelWo(wo)}>
                      <td className="py-2 pr-3 font-medium text-foreground">#{wo.wo_number}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_CLASSES[wo.status]}`}>{STATUS_LABELS[wo.status]}</span>
                        {wo.line_stopped && (
                          <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-800">Line Stopped</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{wo.line_at_time || '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{wo.machine || '—'}</td>
                      <td className="py-2 pr-3 max-w-xs truncate" title={wo.description}>{wo.description}</td>
                      <td className="py-2 pr-3">{wo.requester_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{wo.engineer_name || '—'}</td>
                      <td className="py-2 pr-3 capitalize">{wo.priority}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${DOWNTIME_STATUS_CLASSES[status]}`}>
                          {dt && dt.total_minutes > 0 ? formatDuration(dt.total_minutes) : '—'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{dt?.events_count ?? 0}</td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatDateTime(wo.created_at)}</td>
                      {isEngineer && (
                        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {nextStatus(wo.status) ? (
                              <button
                                onClick={() => handleAdvance(wo)}
                                disabled={advancingId === wo.id}
                                className="btn-secondary text-xs py-1 px-2 whitespace-nowrap"
                                title={`Move to ${STATUS_LABELS[nextStatus(wo.status)!]}`}
                              >
                                {advancingId === wo.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                                {STATUS_LABELS[nextStatus(wo.status)!]}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            {!OPEN_STATUSES.includes(wo.status) ? null : wo.line_stopped ? (
                              <button
                                onClick={() => handleResumeLine(wo)}
                                disabled={advancingId === wo.id}
                                className="text-xs py-1 px-2 rounded whitespace-nowrap bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                title="Resume the line — logs the downtime on the matching shift"
                              >
                                {advancingId === wo.id ? <Loader2 size={12} className="animate-spin inline" /> : null} Resume Line
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStopLine(wo)}
                                disabled={advancingId === wo.id}
                                className="text-xs py-1 px-2 rounded whitespace-nowrap bg-red-100 text-red-800 hover:bg-red-200"
                                title="Stop the line for this work order"
                              >
                                {advancingId === wo.id ? <Loader2 size={12} className="animate-spin inline" /> : null} Stop Line
                              </button>
                            )}
                          </div>
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
      {openPanelWo && <WorkOrderDowntimePanel wo={openPanelWo} onClose={() => setOpenPanelWo(null)} />}
    </>
  );
}
