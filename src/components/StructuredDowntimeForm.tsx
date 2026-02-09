import { useState, useRef } from 'react';
import { Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { StructuredDowntime } from '@/types/downtime';
import { useLookupCache } from '@/hooks/useLookupCache';

interface StructuredDowntimeFormProps {
  downtimes: StructuredDowntime[];
  onChange: (downtimes: StructuredDowntime[]) => void;
  downtimeThreshold?: number;
}

// Parse flexible duration input: "90", "1:30", "1h30m", "1.5"
function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':').map(s => parseInt(s) || 0);
    return (hours * 60) + minutes;
  }
  if (trimmed.includes('.')) {
    return Math.round(parseFloat(trimmed) * 60);
  }
  const hMatch = trimmed.match(/(\d+)h/i);
  const mMatch = trimmed.match(/(\d+)m/i);
  if (hMatch || mMatch) {
    return ((hMatch ? parseInt(hMatch[1]) : 0) * 60) + (mMatch ? parseInt(mMatch[1]) : 0);
  }
  return parseInt(trimmed) || 0;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function DurationInput({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const [inputValue, setInputValue] = useState(value > 0 ? String(value) : '');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value);
  const handleBlur = () => {
    const parsed = parseDuration(inputValue);
    onChange(parsed);
    if (parsed > 0) setInputValue(String(parsed));
  };
  const formatted = parseDuration(inputValue);
  return (
    <div>
      <label className="label text-xs">Duration</label>
      <input type="text" value={inputValue} onChange={handleChange} onBlur={handleBlur}
        className="input-field text-sm" placeholder="Ex: 90 ou 1:30" />
      {formatted > 0 && (
        <p className="text-xs text-muted-foreground mt-1">= {formatted} min ({formatDuration(formatted)})</p>
      )}
    </div>
  );
}

// Inline "add new" input that replaces a dropdown
function InlineNewInput({ 
  placeholder, 
  onConfirm, 
  onCancel 
}: { 
  placeholder: string; 
  onConfirm: (value: string) => void; 
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onConfirm(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleConfirm}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
          if (e.key === 'Escape') onCancel();
        }}
        className="input-field text-sm flex-1"
        placeholder={placeholder}
        maxLength={100}
      />
      <button type="button" onMouseDown={e => { e.preventDefault(); onCancel(); }}
        className="text-muted-foreground hover:text-foreground p-1">
        <X size={14} />
      </button>
    </div>
  );
}

const ADD_NEW_VALUE = '__new__';

export function StructuredDowntimeForm({ downtimes, onChange, downtimeThreshold = 60 }: StructuredDowntimeFormProps) {
  const { categories, getDowntimeReasons, addCategory, addReason } = useLookupCache();
  const [addingNewCategory, setAddingNewCategory] = useState<string | null>(null); // downtime id
  const [addingNewReason, setAddingNewReason] = useState<string | null>(null); // downtime id

  const addDowntime = () => {
    const firstCategory = categories[0]?.value || 'other';
    const firstReason = getDowntimeReasons(firstCategory)[0]?.value || 'other';
    const newDowntime: StructuredDowntime = {
      id: `sdt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: firstCategory,
      reason: firstReason,
      duration: 0,
      comment: '',
    };
    onChange([...downtimes, newDowntime]);
  };

  const removeDowntime = (id: string) => onChange(downtimes.filter(d => d.id !== id));

  const updateDowntime = (id: string, field: keyof StructuredDowntime, value: string | number) => {
    onChange(downtimes.map(d => {
      if (d.id !== id) return d;
      if (field === 'category') {
        const newCat = value as string;
        const firstReason = getDowntimeReasons(newCat)[0]?.value || '';
        return { ...d, category: newCat, reason: firstReason };
      }
      return { ...d, [field]: value };
    }));
  };

  const handleCategorySelect = (downtimeId: string, value: string) => {
    if (value === ADD_NEW_VALUE) {
      setAddingNewCategory(downtimeId);
    } else {
      updateDowntime(downtimeId, 'category', value);
    }
  };

  const handleNewCategoryConfirm = async (downtimeId: string, label: string) => {
    setAddingNewCategory(null);
    const name = await addCategory(label);
    if (name) {
      updateDowntime(downtimeId, 'category', name);
    }
  };

  const handleReasonSelect = (downtimeId: string, value: string) => {
    if (value === ADD_NEW_VALUE) {
      setAddingNewReason(downtimeId);
    } else {
      updateDowntime(downtimeId, 'reason', value);
    }
  };

  const handleNewReasonConfirm = async (downtimeId: string, categoryName: string, label: string) => {
    setAddingNewReason(null);
    const name = await addReason(categoryName, label);
    if (name) {
      updateDowntime(downtimeId, 'reason', name);
    }
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
                  <AlertTriangle size={14} />Exceeds threshold!
                </span>
              )}
            </p>
          )}
        </div>
        <button type="button" onClick={addDowntime} className="btn-secondary text-sm">
          <Plus size={16} />Add Stop
        </button>
      </div>

      {downtimes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-lg">
          No downtime recorded for this shift
        </p>
      ) : (
        <div className="space-y-3">
          {downtimes.map((downtime, index) => {
            const availableReasons = getDowntimeReasons(downtime.category);
            const requiresComment = downtime.category === 'other';
            const isAddingCategory = addingNewCategory === downtime.id;
            const isAddingReason = addingNewReason === downtime.id;

            return (
              <div key={downtime.id} className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Stop #{index + 1}</span>
                  <button type="button" onClick={() => removeDowntime(downtime.id)}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Category */}
                  <div>
                    <label className="label text-xs">Category</label>
                    {isAddingCategory ? (
                      <InlineNewInput
                        placeholder="New category name"
                        onConfirm={(val) => handleNewCategoryConfirm(downtime.id, val)}
                        onCancel={() => setAddingNewCategory(null)}
                      />
                    ) : (
                      <select value={downtime.category}
                        onChange={e => handleCategorySelect(downtime.id, e.target.value)}
                        className="select-field text-sm">
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                        <option value={ADD_NEW_VALUE}>+ Add new...</option>
                      </select>
                    )}
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="label text-xs">Reason</label>
                    {isAddingReason ? (
                      <InlineNewInput
                        placeholder="New reason name"
                        onConfirm={(val) => handleNewReasonConfirm(downtime.id, downtime.category, val)}
                        onCancel={() => setAddingNewReason(null)}
                      />
                    ) : (
                      <select value={downtime.reason}
                        onChange={e => handleReasonSelect(downtime.id, e.target.value)}
                        className="select-field text-sm">
                        {availableReasons.map(reason => (
                          <option key={reason.value} value={reason.value}>{reason.label}</option>
                        ))}
                        <option value={ADD_NEW_VALUE}>+ Add new...</option>
                      </select>
                    )}
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
                    <input type="text" value={downtime.comment || ''}
                      onChange={e => updateDowntime(downtime.id, 'comment', e.target.value)}
                      className={`input-field text-sm ${requiresComment && !downtime.comment ? 'border-destructive' : ''}`}
                      placeholder={requiresComment ? 'Required for Other' : 'Optional'}
                      maxLength={150} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
