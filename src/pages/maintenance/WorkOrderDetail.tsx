import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useWorkOrderDetail, useWorkOrders, nextStatus, WoStatus } from '@/hooks/useWorkOrders';
import { useWorkOrderChecklist } from '@/hooks/useWorkOrderChecklist';
import { useWoPhotos } from '@/hooks/useWoPhotos';
import { SignedPhoto } from '@/components/maintenance/SignedPhoto';
import { useAuth } from '@/contexts/AuthContext';
import { PinEntryModal } from '@/components/maintenance/PinEntryModal';
import { toast } from 'sonner';
import { useState } from 'react';
import { ArrowLeft, Loader2, Clock, CheckCircle2, ArrowRight, AlertTriangle, User, Wrench as WrenchIcon, Square, CheckSquare, ClipboardCheck, Camera } from 'lucide-react';

const STATUS_LABELS: Record<WoStatus, string> = {
  open: 'Open', received: 'Received', arrived: 'Arrived', in_progress: 'In Progress',
  finished: 'Finished', completed: 'Completed', closed: 'Closed', force_closed: 'Force Closed',
};

const STATUS_CLASSES: Record<WoStatus, string> = {
  open: 'bg-red-100 text-red-800', received: 'bg-amber-100 text-amber-800', arrived: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800', finished: 'bg-emerald-100 text-emerald-800', completed: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-muted text-muted-foreground', force_closed: 'bg-muted text-muted-foreground',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

function formatMinutes(min: number | null): string {
  if (min === null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface TimelineStep {
  label: string;
  ts: string | null;
}

export function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { workOrder: wo, logs, isLoading, error, refreshDetail } = useWorkOrderDetail(id);
  const { advanceWorkOrder, stopLine, resumeLine } = useWorkOrders();
  const { items: checklistItems, responses: checklistResponses, toggleItem, allRequiredComplete } = useWorkOrderChecklist(wo?.id, wo?.description);
  const { photos, isUploading, uploadPhoto } = useWoPhotos(wo?.id);
  const [isActing, setIsActing] = useState(false);
  const [pinModalFor, setPinModalFor] = useState<'accept' | 'finish' | null>(null);

  const isEngineer = hasRole('engineer');

  const doAdvance = async (engineerId?: string, engineerName?: string) => {
    if (!wo) return;
    setIsActing(true);
    const result = await advanceWorkOrder(wo, engineerId, engineerName);
    setIsActing(false);
    if (!result.success) {
      toast.error(`Failed to advance: ${result.error}`);
      return;
    }
    toast.success(engineerName ? `Confirmed by ${engineerName}` : 'Work order advanced');
    refreshDetail();
  };

  const handleAdvance = () => {
    if (!wo) return;
    if (wo.status === 'open') {
      setPinModalFor('accept');
      return;
    }
    if (wo.status === 'in_progress') {
      setPinModalFor('finish');
      return;
    }
    doAdvance();
  };

  const handlePinVerified = (engineerId: string, engineerName: string) => {
    setPinModalFor(null);
    doAdvance(engineerId, engineerName);
  };

  const handleStopLine = async () => {
    if (!wo) return;
    setIsActing(true);
    const result = await stopLine(wo);
    setIsActing(false);
    if (!result.success) {
      toast.error(`Failed to stop line: ${result.error}`);
      return;
    }
    toast.success('Line stopped');
    refreshDetail();
  };

  const handleResumeLine = async () => {
    if (!wo) return;
    setIsActing(true);
    const result = await resumeLine(wo);
    setIsActing(false);
    if (!result.success) {
      toast.error(`Failed to resume line: ${result.error}`);
      return;
    }
    toast.success('Line resumed — logged on the shift');
    refreshDetail();
  };

  const handleToggleChecklist = async (checklistId: string, completed: boolean) => {
    const result = await toggleItem(checklistId, completed, user?.id);
    if (!result.success) {
      toast.error(`Failed to update checklist: ${result.error}`);
    }
  };

  const handlePhotoUpload = async (photoType: 'before' | 'after', file: File) => {
    if (!user?.id) return;
    const result = await uploadPhoto(file, photoType, user.id);
    if (!result.success) {
      toast.error(`Failed to upload photo: ${result.error}`);
      return;
    }
    toast.success('Photo uploaded');
  };

  if (isLoading) {
    return (
      <>
        <Header title="Work Order" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center p-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (error || !wo) {
    return (
      <>
        <Header title="Work Order" subtitle="Not found" />
        <div className="flex-1 p-6 text-center text-muted-foreground">
          {error || 'Work order not found.'}
          <div className="mt-3">
            <button onClick={() => navigate('/maintenance/work-orders')} className="btn-secondary">
              <ArrowLeft size={14} /> Back to Work Orders
            </button>
          </div>
        </div>
      </>
    );
  }

  const responseMin = minutesBetween(wo.created_at, wo.received_at);
  const executionMin = minutesBetween(wo.started_at, wo.finished_at);
  const totalMin = minutesBetween(wo.created_at, wo.finished_at || wo.closed_at);

  const timelineSteps: TimelineStep[] = [
    { label: 'Work order created', ts: wo.created_at },
    { label: 'Engineer accepted', ts: wo.received_at },
    { label: 'Engineer arrived', ts: wo.arrived_at },
    { label: 'Work started', ts: wo.started_at },
    { label: 'Work finished', ts: wo.finished_at },
    { label: 'Work order closed', ts: wo.closed_at },
  ].filter(step => step.ts);

  return (
    <>
      <Header title={`Work Order #${wo.wo_number}`} subtitle={wo.line_at_time || 'Maintenance ticket'} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">
        <button onClick={() => navigate('/maintenance/work-orders')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Work Orders
        </button>

        <div className="card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{wo.description}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {wo.line_at_time || 'Unknown line'}{wo.machine ? ` · ${wo.machine}` : ''}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_CLASSES[wo.status]}`}>{STATUS_LABELS[wo.status]}</span>
              {wo.line_stopped && <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-800">Line Stopped</span>}
              <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground capitalize">{wo.priority} priority</span>
            </div>
          </div>
          {wo.notes && (
            <div className="mt-3 pt-3 border-t border-border text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-foreground">{wo.notes}</p>
            </div>
          )}
        </div>

        {isEngineer && (
          <div className="card p-4 sm:p-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WrenchIcon size={16} /> Engineer actions
            </div>
            <div className="flex items-center gap-2">
              {wo.line_stopped ? (
                <button onClick={handleResumeLine} disabled={isActing} className="text-sm py-1.5 px-3 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                  {isActing ? <Loader2 size={14} className="animate-spin inline" /> : null} Resume Line
                </button>
              ) : (
                <button onClick={handleStopLine} disabled={isActing} className="text-sm py-1.5 px-3 rounded bg-red-100 text-red-800 hover:bg-red-200">
                  {isActing ? <Loader2 size={14} className="animate-spin inline" /> : null} Stop Line
                </button>
              )}
              {nextStatus(wo.status) && (
                <button
                  onClick={handleAdvance}
                  disabled={isActing || (wo.status === 'in_progress' && !allRequiredComplete)}
                  title={wo.status === 'in_progress' && !allRequiredComplete ? 'Complete all required checklist items first' : undefined}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  {isActing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  {wo.status === 'open' ? 'Accept (PIN required)' : wo.status === 'in_progress' ? 'Finish (PIN required)' : `Move to ${STATUS_LABELS[nextStatus(wo.status)!]}`}
                </button>
              )}
            </div>
          </div>
        )}

        <PinEntryModal
          open={pinModalFor !== null}
          title={pinModalFor === 'accept' ? 'Confirm engineer accepting this ticket' : 'Confirm engineer finishing this repair'}
          description="Enter your personal PIN to continue."
          onClose={() => setPinModalFor(null)}
          onVerified={handlePinVerified}
        />

        {checklistItems.length > 0 && (
          <div className="card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><ClipboardCheck size={14} /> Safety Checklist</p>
              {!allRequiredComplete && (
                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Required items pending</span>
              )}
            </div>
            <div className="space-y-2">
              {checklistItems.map(item => {
                const response = checklistResponses.find(r => r.checklist_id === item.id);
                const completed = response?.completed || false;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => isEngineer && handleToggleChecklist(item.id, !completed)}
                    disabled={!isEngineer}
                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${completed ? 'bg-emerald-50 border-emerald-200' : 'border-border hover:bg-muted/50'} ${!isEngineer ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {completed ? <CheckSquare size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" /> : <Square size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className={`text-sm ${completed ? 'text-emerald-800' : 'text-foreground'}`}>
                        {item.description}
                        {item.is_required && <span className="text-destructive ml-1">*</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="card p-4 sm:p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Attendance Times</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Response</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(responseMin)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Execution</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(executionMin)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="text-xl font-bold text-foreground">{formatMinutes(totalMin)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <User size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Requested by</p>
              <p className="font-medium text-foreground">{wo.requester_name}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <WrenchIcon size={16} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Engineer</p>
              <p className="font-medium text-foreground">{wo.engineer_name || 'Not yet assigned'}</p>
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Camera size={14} /> Photos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['before', 'after'] as const).map(type => {
              const typePhotos = photos.filter(p => p.photo_type === type);
              return (
                <div key={type}>
                  <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">{type}</p>
                  <div className="space-y-2">
                    {typePhotos.map(photo => (
                      <SignedPhoto key={photo.id} storagePath={photo.storage_path} alt={`${type} photo`} />
                    ))}
                    {isEngineer && (
                      <label className="flex items-center justify-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-lg py-3 cursor-pointer hover:bg-muted/50">
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        Add {type} photo
                        <input
                          type="file" accept="image/*" className="hidden" disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(type, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Clock size={14} /> Timeline</p>
          {timelineSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            <div className="space-y-3">
              {timelineSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="rounded-full p-1.5 bg-primary/10 mt-0.5">
                    <CheckCircle2 size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(step.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="card p-4 sm:p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><AlertTriangle size={14} /> Activity Log</p>
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="text-sm flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-foreground">{log.action}{log.engineer_name ? ` — ${log.engineer_name}` : ''}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
