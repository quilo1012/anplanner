import { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkOrders, useWorkOrderDetail, nextStatus, WorkOrder } from '@/hooks/useWorkOrders';
import { useWoPhotos, PhotoType } from '@/hooks/useWoPhotos';
import { useAuth } from '@/contexts/AuthContext';
import { SignedPhoto } from '@/components/maintenance/SignedPhoto';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, Camera, Loader2, ImagePlus, ChevronRight, AlertOctagon, PlayCircle,
  MessageSquare, Send, Clock, CheckCircle2,
} from 'lucide-react';

function PhotoSection({
  workOrderId, type, canUpload,
}: { workOrderId: string; type: PhotoType; canUpload: boolean }) {
  const { user } = useAuth();
  const { photos, isLoading, isUploading, uploadPhoto } = useWoPhotos(workOrderId);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = photos.filter(p => p.photo_type === type);

  const handleFile = async (file: File | null) => {
    if (!file || !user?.id) return;
    await uploadPhoto(file, type, user.id);
    if (inputRef.current) inputRef.current.value = '';
  };

  const label = type === 'before' ? 'Before' : 'After';

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Camera size={14} className="text-primary" /> {label} photos
          <span className="text-xs text-muted-foreground">({filtered.length})</span>
        </h3>
        {canUpload && (
          <>
            <input ref={inputRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            <button onClick={() => inputRef.current?.click()} disabled={isUploading}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {isUploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
              {isUploading ? 'Uploading…' : `Add ${label.toLowerCase()}`}
            </button>
          </>
        )}
      </div>
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No {label.toLowerCase()} photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map(p => (
            <SignedPhoto key={p.id} storagePath={p.storage_path} alt={`${label} photo`}
              className="aspect-square w-full object-cover rounded border border-border" />
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-500/20 text-amber-400',
  received: 'bg-blue-500/20 text-blue-400',
  arrived: 'bg-indigo-500/20 text-indigo-400',
  in_progress: 'bg-purple-500/20 text-purple-400',
  finished: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-muted text-muted-foreground',
};

interface WoMessage {
  id: string;
  user_name: string | null;
  message: string;
  created_at: string;
}

function MessagesSection({ workOrderId }: { workOrderId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WoMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('wo_messages' as never)
      .select('id,user_name,message,created_at')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });
    setMessages((data as unknown as WoMessage[]) || []);
    setLoading(false);
  }, [workOrderId]);

  useEffect(() => { fetch(); }, [fetch]);

  const send = async () => {
    if (!draft.trim() || !user?.id) return;
    setSending(true);
    const { error } = await supabase.from('wo_messages' as never).insert({
      work_order_id: workOrderId, user_id: user.id, user_name: user.name || null, message: draft.trim(),
    } as never);
    setSending(false);
    if (error) { toast.error(`Message failed: ${error.message}`); return; }
    setDraft('');
    fetch();
  };

  return (
    <div className="card p-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
        <MessageSquare size={14} className="text-primary" /> Messages
        <span className="text-xs text-muted-foreground">({messages.length})</span>
      </h3>
      <div className="space-y-1.5 max-h-56 overflow-auto mb-2">
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : messages.length === 0 ? <p className="text-xs text-muted-foreground py-2">No messages yet.</p>
          : messages.map(m => (
            <div key={m.id} className="text-xs bg-muted/40 rounded px-2 py-1.5">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-foreground">{m.user_name || 'Unknown'}</span>
                <span className="text-muted-foreground">{fmt(m.created_at)}</span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Write a message…"
          className="flex-1 text-xs px-2 py-1.5 rounded bg-background border border-border text-foreground" />
        <button onClick={send} disabled={sending || !draft.trim()}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
        </button>
      </div>
    </div>
  );
}

function Timeline({ wo, logs }: { wo: WorkOrder; logs: { id: string; action: string; engineer_name: string | null; created_at: string }[] }) {
  const stamps: { label: string; ts: string | null }[] = [
    { label: 'Created', ts: wo.created_at },
    { label: 'Received', ts: wo.received_at },
    { label: 'Arrived', ts: wo.arrived_at },
    { label: 'In progress', ts: wo.started_at },
    { label: 'Finished', ts: wo.finished_at },
    { label: 'Closed', ts: wo.closed_at },
  ];
  return (
    <div className="card p-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
        <Clock size={14} className="text-primary" /> Timeline
      </h3>
      <div className="space-y-1 text-xs">
        {stamps.map(s => (
          <div key={s.label} className="flex justify-between gap-2">
            <span className={s.ts ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              {s.ts ? <CheckCircle2 size={11} className="inline text-emerald-500 mr-1" /> : null}{s.label}
            </span>
            <span className="text-muted-foreground">{fmt(s.ts)}</span>
          </div>
        ))}
        {logs.length > 0 && (
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            {logs.map(l => (
              <div key={l.id} className="flex justify-between gap-2">
                <span className="text-foreground">{l.action}{l.engineer_name ? ` — ${l.engineer_name}` : ''}</span>
                <span className="text-muted-foreground">{fmt(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { workOrders, isLoading, advanceWorkOrder, stopLine, resumeLine, refreshWorkOrders } = useWorkOrders();
  const { logs, refreshDetail } = useWorkOrderDetail(id);
  const { user, hasRole } = useAuth();
  const wo = workOrders.find(w => w.id === id);
  const [busy, setBusy] = useState(false);

  const isEngineer = hasRole('engineer') || hasRole('admin');
  const canUpload = isEngineer;
  const next = wo ? nextStatus(wo.status) : null;

  const handleAdvance = async () => {
    if (!wo) return;
    setBusy(true);
    const result = wo.status === 'open'
      ? await advanceWorkOrder(wo, user?.id, user?.name)
      : await advanceWorkOrder(wo);
    setBusy(false);
    if (!result.success) { toast.error(`Failed: ${result.error}`); return; }
    toast.success(`Advanced to ${next}`);
    refreshDetail();
  };

  const handleStop = async () => {
    if (!wo) return;
    setBusy(true);
    const r = await stopLine(wo);
    setBusy(false);
    if (!r.success) { toast.error(`Failed: ${r.error}`); return; }
    toast.success('Line stopped'); refreshDetail();
  };

  const handleResume = async () => {
    if (!wo) return;
    setBusy(true);
    const r = await resumeLine(wo);
    setBusy(false);
    if (!r.success) { toast.error(`Failed: ${r.error}`); return; }
    toast.success('Line resumed — logged on shift'); refreshDetail();
  };

  if (isLoading) {
    return (
      <>
        <Header title="Work Order" subtitle="Loading…" />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
      </>
    );
  }

  if (!wo) {
    return (
      <>
        <Header title="Work Order" subtitle="Not found" />
        <div className="p-6">
          <Link to="/maintenance/work-orders" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
            <ArrowLeft size={14} /> Back to work orders
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">No work order found with id {id}.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={`WO #${wo.wo_number}`} subtitle={wo.line_at_time || '—'} />
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link to="/maintenance/work-orders" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
            <ArrowLeft size={12} /> Back to work orders
          </Link>
          <button onClick={() => { refreshWorkOrders(); refreshDetail(); }}
            className="text-xs text-muted-foreground hover:text-foreground">Refresh</button>
        </div>

        <div className="card p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Status</p>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[wo.status] || 'bg-muted'}`}>
                {wo.status}
              </span>
            </div>
            <div><p className="text-muted-foreground">Priority</p><p className="font-semibold text-foreground">{wo.priority}</p></div>
            <div><p className="text-muted-foreground">Requester</p><p className="font-semibold text-foreground">{wo.requester_name || '—'}</p></div>
            <div><p className="text-muted-foreground">Engineer</p><p className="font-semibold text-foreground">{wo.engineer_name || '—'}</p></div>
            <div className="col-span-2 sm:col-span-4">
              <p className="text-muted-foreground">Description</p>
              <p className="text-sm text-foreground">{wo.description}</p>
            </div>
            {wo.machine && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-muted-foreground">Machine</p>
                <p className="text-sm text-foreground">{wo.machine}</p>
              </div>
            )}
          </div>

          {isEngineer && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
              {next && (
                <button onClick={handleAdvance} disabled={busy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                  Advance to {next}
                </button>
              )}
              {!wo.line_stopped ? (
                <button onClick={handleStop} disabled={busy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                  <AlertOctagon size={12} /> Stop line
                </button>
              ) : (
                <button onClick={handleResume} disabled={busy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                  <PlayCircle size={12} /> Resume line
                </button>
              )}
            </div>
          )}

          {wo.status === 'finished' || wo.status === 'closed' ? (
            <div className="mt-3 pt-3 border-t border-border text-xs bg-emerald-500/10 -mx-3 -mb-3 px-3 py-2 rounded-b">
              <p className="font-semibold text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> Signed off by {wo.engineer_name || '—'}</p>
              <p className="text-muted-foreground">Finished {fmt(wo.finished_at)}{wo.closed_at ? ` • Closed ${fmt(wo.closed_at)}` : ''}</p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Timeline wo={wo} logs={logs} />
          <MessagesSection workOrderId={wo.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PhotoSection workOrderId={wo.id} type="before" canUpload={canUpload} />
          <PhotoSection workOrderId={wo.id} type="after" canUpload={canUpload} />
        </div>
      </div>
    </>
  );
}
