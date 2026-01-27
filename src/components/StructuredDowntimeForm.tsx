import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { 
  StructuredDowntime, 
  DowntimeCategory, 
  DOWNTIME_CATEGORIES, 
  DOWNTIME_REASONS_BY_CATEGORY 
} from '@/types/downtime';

interface StructuredDowntimeFormProps {
  downtimes: StructuredDowntime[];
  onChange: (downtimes: StructuredDowntime[]) => void;
  downtimeThreshold?: number; // minutes
}

export function StructuredDowntimeForm({ 
  downtimes, 
  onChange, 
  downtimeThreshold = 60 
}: StructuredDowntimeFormProps) {
  const addDowntime = () => {
    const newDowntime: StructuredDowntime = {
      id: `sdt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: 'machine',
      reason: 'breakdown',
      duration: 0,
      comment: '',
    };
    onChange([...downtimes, newDowntime]);
  };

  const removeDowntime = (id: string) => {
    onChange(downtimes.filter(d => d.id !== id));
  };

  const updateDowntime = (
    id: string, 
    field: keyof StructuredDowntime, 
    value: string | number
  ) => {
    onChange(
      downtimes.map(d => {
        if (d.id !== id) return d;
        
        // If category changes, reset reason to first available
        if (field === 'category') {
          const newCategory = value as DowntimeCategory;
          const firstReason = DOWNTIME_REASONS_BY_CATEGORY[newCategory][0]?.value || '';
          return { ...d, category: newCategory, reason: firstReason };
        }
        
        return { ...d, [field]: value };
      })
    );
  };

  const totalDowntime = downtimes.reduce((sum, d) => sum + d.duration, 0);
  const exceedsThreshold = totalDowntime > downtimeThreshold;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[hsl(var(--foreground))]">Downtime / Line Stops</h3>
          {downtimes.length > 0 && (
            <p className={`text-sm ${exceedsThreshold ? 'text-[hsl(var(--destructive))] font-medium' : 'text-[hsl(var(--muted-foreground))]'}`}>
              Total: {totalDowntime} minutes
              {exceedsThreshold && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Exceeds threshold!
                </span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addDowntime}
          className="btn-secondary text-sm"
        >
          <Plus size={16} />
          Add Stop
        </button>
      </div>

      {downtimes.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] italic py-4 text-center border border-dashed border-[hsl(var(--border))] rounded-lg">
          No downtime recorded for this shift
        </p>
      ) : (
        <div className="space-y-3">
          {downtimes.map((downtime, index) => {
            const availableReasons = DOWNTIME_REASONS_BY_CATEGORY[downtime.category];
            const requiresComment = downtime.category === 'other';
            
            return (
              <div
                key={downtime.id}
                className="p-4 bg-white rounded-lg border border-[hsl(var(--border))]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Stop #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDowntime(downtime.id)}
                    className="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 p-1 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Category */}
                  <div>
                    <label className="label text-xs">Category</label>
                    <select
                      value={downtime.category}
                      onChange={e => updateDowntime(downtime.id, 'category', e.target.value)}
                      className="select-field text-sm"
                    >
                      {DOWNTIME_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="label text-xs">Reason</label>
                    <select
                      value={downtime.reason}
                      onChange={e => updateDowntime(downtime.id, 'reason', e.target.value)}
                      className="select-field text-sm"
                    >
                      {availableReasons.map(reason => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
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

                  {/* Comment */}
                  <div>
                    <label className="label text-xs">
                      Comment {requiresComment && <span className="text-[hsl(var(--destructive))]">*</span>}
                    </label>
                    <input
                      type="text"
                      value={downtime.comment || ''}
                      onChange={e => updateDowntime(downtime.id, 'comment', e.target.value)}
                      className={`input-field text-sm ${requiresComment && !downtime.comment ? 'border-[hsl(var(--destructive))]' : ''}`}
                      placeholder={requiresComment ? 'Required for Other' : 'Optional'}
                      maxLength={150}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Box */}
      {exceedsThreshold && (
        <div className="mt-4 p-3 bg-[hsl(0,85%,97%)] border border-[hsl(0,60%,85%)] rounded-lg flex items-center gap-2 text-sm text-[hsl(var(--destructive))]">
          <AlertTriangle size={18} />
          <span>
            Total downtime ({totalDowntime} min) exceeds the threshold of {downtimeThreshold} minutes. 
            Please review and ensure all stops are documented correctly.
          </span>
        </div>
      )}
    </div>
  );
}
