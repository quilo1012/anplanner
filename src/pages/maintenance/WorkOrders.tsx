import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkOrders, WoStatus, nextStatus, WorkOrder } from '@/hooks/useWorkOrders';
import { useProblemDescriptions } from '@/hooks/useProblemDescriptions';
import { useLineWoHistory } from '@/hooks/useLineWoHistory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { toast } from 'sonner';
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

function NewWorkOrderForm({ onClose, onCreated, initialLineStopped }: { onClose: () => void; onCreated: () => void; initialLineStopped?: boolean }) {
  const { user } = useAuth();
  const { createWorkOrder } = useWorkOrders();
  const { problems } = useProblemDescriptions();
  const lines = useLinesList();
  const [problemId, setProblemId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineId, setLineId] = useState('');
  const [machine, setMachine] = useState('');
  const [priority, setPriority] = useState('medium');
  const [lineStopped, setLineStopped] = useState(initialLineStopped ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { history: lineHistory } = useLineWoHistory(lineId || undefined);

  const problemsByCategory = useMemo(() => {
    const groups = new Map<string, typeof problems>();
    for (const p of problems) {
      const cat = p.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return groups;
  }, [problems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemId || !lineId) {
      toast.error('Please select a line and a problem type.');
      return;
    }
    const lineName = lines.find(l => l.id === lineId)?.name || '';
    const problemName = problems.find(p => p.id === problemId)?.name || '';
    setIsSubmitting(true);
    const result = await createWorkOrder({
      description: problemName,
      lineId,
      lineName,
      machine: machine.trim() || undefined,
      priority,
      requesterName: user?.name || 'Unknown',
      operatorId: user?.id || '',
      notes: notes.trim() || undefined,
      lineStopped,
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLineStopped(!lineStopped)}
            className={`text-xs font-medium px-2 py-1 rounded ${lineStopped ? 'bg-red-100 text-red-800' : 'bg-muted text-muted-foreground'}`}
          >
            {lineStopped ? '● Line Stopped' : 'Line Running — click to mark stopped'}
          </button>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={16} /></button>
        </div>
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
          <label className="block text-xs font-medium text-muted-foreground mb-1">Problem Type *</label>
          <select value={problemId} onChange={(e) => setProblemId(e.target.value)} className="input-field" required>
            <option value="">Select problem...</option>
            {Array.from(problemsByCategory.entries()).map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            ))}
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
      {lineHistory && lineHistory.totalCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="text-amber-700 shrink-0" />
          <span className="text-amber-800">
            {lineHistory.totalCount} previous WO(s) · Last WO: {lineHistory.lastWoDaysAgo} day(s) ago
          </span>
          {lineHistory.commonProblems.length > 0 && (
            <span className="text-amber-700">Common:</span>
          )}
          {lineHistory.commonProblems.map(p => (
            <span key={p.description} className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
              {p.description} ({p.count}x)
            </span>
          ))}
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Additional notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} placeholder="Any extra detail..." />
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
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | WoStatus>('OPEN');
  const [formOpen, setFormOpen] = useState<{ open: boolean; lineStopped: boolean }>({ open: false, lineStopped: false });
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const isEngineer = hasRole('engineer');
  const canCreate = hasRole(['supervisor', 'admin', 'operator']);

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
        {canCreate && !formOpen.open && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => setFormOpen({ open: true, lineStopped: false })}
                className="card p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-primary/10"><Plus size={18} className="text-primary" /></div>
                <div>
                  <p className="font-medium text-foreground">New Work Order</p>
                  <p className="text-xs text-muted-foreground">Submit a maintenance request</p>
                </div>
              </button>
              <button
                onClick={() => setStatusFilter('OPEN')}
                className="card p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted"><Clock size={18} className="text-muted-foreground" /></div>
                <div>
                  <p className="font-medium text-foreground">My Work Orders</p>
                  <p className="text-xs text-muted-foreground">Track your submitted orders</p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setFormOpen({ open: true, lineStopped: true })}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white p-4 text-left transition-colors"
              >
                <p className="text-lg font-bold">● MACHINE STOPPED</p>
                <p className="text-sm text-red-100">Open WO Request — Line Stopped (downtime starts now)</p>
              </button>
              <button
                onClick={() => setFormOpen({ open: true, lineStopped: false })}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white p-4 text-left transition-colors"
              >
                <p className="text-lg font-bold">⚠ PROBLEM, LINE STILL RUNNING</p>
                <p className="text-sm text-amber-100">Open WO Request — Line in Operation (no downtime)</p>
              </button>
            </div>
          </>
        )}

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

        {formOpen.open && (
          <NewWorkOrderForm
            onClose={() => setFormOpen({ open: false, lineStopped: false })}
            onCreated={refreshWorkOrders}
            initialLineStopped={formOpen.lineStopped}
          />
        )}

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
              {canCreate && !formOpen.open && (
                <button onClick={() => setFormOpen({ open: true, lineStopped: false })} className="btn-primary text-sm">
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
                    <th className="py-2 pr-3">Created</th>
                    {isEngineer && <th className="py-2 pr-3">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/maintenance/work-orders/${wo.id}`)}>
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
