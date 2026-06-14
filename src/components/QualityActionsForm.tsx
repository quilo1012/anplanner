import { useState } from 'react';
import { ShieldAlert, Plus, X } from 'lucide-react';
import { useQualityActionTypes } from '@/hooks/useQualityActionTypes';
import { QualityActionRow } from '@/types/quality';

interface Props {
  rows: QualityActionRow[];
  onChange: (rows: QualityActionRow[]) => void;
}

export function QualityActionsForm({ rows, onChange }: Props) {
  const { types, loading } = useQualityActionTypes(true);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [notes, setNotes] = useState('');

  const totalPoints = rows.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

  const add = () => {
    const t = types.find(x => x.id === selectedTypeId);
    if (!t) return;
    onChange([
      ...rows,
      {
        tempId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        action_type_id: t.id,
        name: t.name,
        points: Number(t.points) || 0,
        notes: notes.trim(),
      },
    ]);
    setSelectedTypeId('');
    setNotes('');
  };

  const remove = (tempId: string) => onChange(rows.filter(r => r.tempId !== tempId));

  return (
    <div className="card p-4 sm:p-6 border-l-4 border-l-amber-500">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
        <ShieldAlert size={20} className="text-amber-500" />
        Quality Issues
        <span className="ml-auto text-sm font-normal text-muted-foreground">
          Penalty: <span className="font-bold text-amber-500">{totalPoints} pts</span>
        </span>
      </h3>

      {rows.length > 0 ? (
        <ul className="space-y-2 mb-4">
          {rows.map(r => (
            <li key={r.tempId} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
              <span className="font-medium flex-1 truncate">{r.name}</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                -{r.points} pts
              </span>
              {r.notes && <span className="text-xs text-muted-foreground italic truncate max-w-[40%]">"{r.notes}"</span>}
              <button type="button" onClick={() => remove(r.tempId)} className="p-1 hover:bg-destructive/10 text-destructive rounded">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">No quality issues recorded.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div>
          <label className="label text-xs">Action type</label>
          <select
            value={selectedTypeId}
            onChange={e => setSelectedTypeId(e.target.value)}
            className="select-field w-full text-sm"
            disabled={loading}
          >
            <option value="">Select type...</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>{t.name} (-{t.points} pts)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Note (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input-field w-full text-sm"
            placeholder="Optional note"
            maxLength={300}
          />
        </div>
        <button type="button" onClick={add} disabled={!selectedTypeId} className="btn-secondary text-sm">
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}
