import { Downtime, DowntimeReason } from '@/types/shift';
import { Plus, Trash2 } from 'lucide-react';

interface DowntimeFormProps {
  downtimes: Downtime[];
  onChange: (downtimes: Downtime[]) => void;
}

const downtimeReasons: { value: DowntimeReason; label: string }[] = [
  { value: 'machine_breakdown', label: 'Machine Breakdown' },
  { value: 'lack_of_material', label: 'Lack of Raw Material' },
  { value: 'battery_waiting', label: 'Battery Waiting' },
  { value: 'setup', label: 'Setup' },
  { value: 'other', label: 'Other' },
];

export function DowntimeForm({ downtimes, onChange }: DowntimeFormProps) {
  const addDowntime = () => {
    const newDowntime: Downtime = {
      id: `dt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reason: 'machine_breakdown',
      duration: 0,
      notes: '',
    };
    onChange([...downtimes, newDowntime]);
  };

  const removeDowntime = (id: string) => {
    onChange(downtimes.filter(d => d.id !== id));
  };

  const updateDowntime = (id: string, field: keyof Downtime, value: string | number) => {
    onChange(
      downtimes.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const totalDowntime = downtimes.reduce((sum, d) => sum + d.duration, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[hsl(var(--foreground))]">Downtime / Stops</h3>
          {downtimes.length > 0 && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Total: {totalDowntime} minutes
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addDowntime}
          className="btn-secondary text-sm"
        >
          <Plus size={16} />
          Add Downtime
        </button>
      </div>

      {downtimes.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] italic py-4 text-center border border-dashed border-[hsl(var(--border))] rounded-lg">
          No downtime recorded for this shift
        </p>
      ) : (
        <div className="space-y-3">
          {downtimes.map((downtime, index) => (
            <div
              key={downtime.id}
              className="p-4 bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Downtime #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeDowntime(downtime.id)}
                  className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 p-1 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Reason</label>
                  <select
                    value={downtime.reason}
                    onChange={e => updateDowntime(downtime.id, 'reason', e.target.value)}
                    className="select-field text-sm"
                  >
                    {downtimeReasons.map(reason => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label text-xs">Duration (min)</label>
                  <input
                    type="number"
                    value={downtime.duration || ''}
                    onChange={e => updateDowntime(downtime.id, 'duration', parseInt(e.target.value) || 0)}
                    min="0"
                    className="input-field text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="label text-xs">Notes</label>
                  <input
                    type="text"
                    value={downtime.notes || ''}
                    onChange={e => updateDowntime(downtime.id, 'notes', e.target.value)}
                    className="input-field text-sm"
                    placeholder="Optional notes"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
