import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useDevices } from '@/hooks/useDevices';
import { supabase } from '@/integrations/supabase/client';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { toast } from 'sonner';
import { Loader2, Tablet, Plus, Trash2, Copy } from 'lucide-react';

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

function formatDateTime(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function DeviceSetup() {
  const { devices, isLoading, createDevice, setDeviceLines, deleteDevice } = useDevices();
  const lines = useLinesList();
  const [newLabel, setNewLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      toast.error('Give the tablet a label, e.g. "Filler Lines Tablet".');
      return;
    }
    setIsCreating(true);
    const result = await createDevice(newLabel.trim());
    setIsCreating(false);
    if (!result.success) {
      toast.error(`Failed to create tablet: ${result.error}`);
      return;
    }
    toast.success(`Tablet created — pairing code: ${result.token}`);
    setNewLabel('');
  };

  const handleToggleLine = async (deviceId: string, currentLineIds: string[], lineId: string) => {
    const newLineIds = currentLineIds.includes(lineId)
      ? currentLineIds.filter(id => id !== lineId)
      : [...currentLineIds, lineId];
    setSavingId(deviceId);
    const result = await setDeviceLines(deviceId, newLineIds);
    setSavingId(null);
    if (!result.success) {
      toast.error(`Failed to update lines: ${result.error}`);
    }
  };

  const handleDelete = async (deviceId: string, label: string | null) => {
    if (!confirm(`Remove tablet "${label || 'Untitled'}"? Any device using this pairing code will lose access.`)) return;
    const result = await deleteDevice(deviceId);
    if (!result.success) {
      toast.error(`Failed to remove tablet: ${result.error}`);
      return;
    }
    toast.success('Tablet removed');
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Pairing code copied');
  };

  return (
    <>
      <Header
        title="Tablet Setup"
        subtitle="Pair shop-floor tablets to production lines for opening maintenance requests"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        <div className="card p-4 sm:p-6">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3"><Plus size={16} /> Add a new tablet</h3>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Filler Lines 1-3 Tablet"
              className="input-field flex-1 min-w-[200px]"
            />
            <button onClick={handleCreate} disabled={isCreating} className="btn-primary text-sm">
              {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 size={18} className="animate-spin" /> Loading tablets...
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No tablets paired yet.</div>
        ) : (
          devices.map(device => (
            <div key={device.id} className="card p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-center gap-2">
                  <Tablet size={18} className="text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{device.label || 'Untitled tablet'}</p>
                    <p className="text-xs text-muted-foreground">Last seen: {formatDateTime(device.last_seen_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToken(device.device_token)}
                    className="text-xs font-mono bg-muted px-2 py-1 rounded flex items-center gap-1.5 hover:bg-muted/70"
                    title="Copy pairing code"
                  >
                    <Copy size={12} /> {device.device_token}
                  </button>
                  <button onClick={() => handleDelete(device.id, device.label)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Lines covered by this tablet:</p>
              <div className="flex flex-wrap gap-2">
                {lines.map(line => {
                  const checked = device.line_ids.includes(line.id);
                  return (
                    <button
                      key={line.id}
                      onClick={() => handleToggleLine(device.id, device.line_ids, line.id)}
                      disabled={savingId === device.id}
                      className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border ${checked ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      {line.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
