import { useState } from 'react';
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

// Parse flexible duration input: "90", "1:30", "1h30m", "1.5"
function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  
  // Format HH:MM (1:30 → 90)
  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':').map(s => parseInt(s) || 0);
    return (hours * 60) + minutes;
  }
  
  // Format decimal (1.5 → 90)
  if (trimmed.includes('.')) {
    return Math.round(parseFloat(trimmed) * 60);
  }
  
  // Format with 'h' and 'm' (1h30m → 90)
  const hMatch = trimmed.match(/(\d+)h/i);
  const mMatch = trimmed.match(/(\d+)m/i);
  if (hMatch || mMatch) {
    const hours = hMatch ? parseInt(hMatch[1]) : 0;
    const minutes = mMatch ? parseInt(mMatch[1]) : 0;
    return (hours * 60) + minutes;
  }
  
  // Direct number (90 → 90)
  return parseInt(trimmed) || 0;
}

// Format minutes to readable string
function formatDuration(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Duration input component with flexible parsing
function DurationInput({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const [inputValue, setInputValue] = useState(value > 0 ? String(value) : '');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
  };
  
  const handleBlur = () => {
    const parsed = parseDuration(inputValue);
    onChange(parsed);
    // Update display to show parsed value if different
    if (parsed > 0) {
      setInputValue(String(parsed));
    }
  };
  
  const formatted = parseDuration(inputValue);
  
  return (
    <div>
      <label className="label text-xs">Duration</label>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="input-field text-sm"
        placeholder="Ex: 90 ou 1:30"
      />
      {formatted > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          = {formatted} min ({formatDuration(formatted)})
        </p>
      )}
    </div>
  );
}

export function StructuredDowntimeForm({ 
  downtimes, 
  onChange, 
  downtimeThreshold = 60 
}: StructuredDowntimeFormProps) {
  const addDowntime = () => {
    const newDowntime: StructuredDowntime = {
      id: `sdt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: 'maintenance',
      reason: 'cleaning',
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
          <h3 className="font-semibold text-foreground">Downtime / Line Stops</h3>
          {downtimes.length > 0 && (
            <p className={`text-sm ${exceedsThreshold ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
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
        <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-lg">
          No downtime recorded for this shift
        </p>
      ) : (
        <div className="space-y-3">
          {downtimes.map((downtime, index) => {
            const availableReasons = DOWNTIME_REASONS_BY_CATEGORY[downtime.category] || [];
            const requiresComment = downtime.category === 'other';
            
            return (
              <div
                key={downtime.id}
                className="p-4 bg-card rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">
                    Stop #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDowntime(downtime.id)}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
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
                  <DurationInput
                    value={downtime.duration}
                    onChange={(val) => updateDowntime(downtime.id, 'duration', val)}
                  />

                  {/* Comment */}
                  <div>
                    <label className="label text-xs">
                      Comment {requiresComment && <span className="text-destructive">*</span>}
                    </label>
                    <input
                      type="text"
                      value={downtime.comment || ''}
                      onChange={e => updateDowntime(downtime.id, 'comment', e.target.value)}
                      className={`input-field text-sm ${requiresComment && !downtime.comment ? 'border-destructive' : ''}`}
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
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-sm text-destructive">
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
