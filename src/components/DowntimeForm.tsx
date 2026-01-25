import { Downtime, DowntimeReason, DOWNTIME_REASONS } from '@/types/shift';

interface DowntimeFormProps {
  downtimes: Downtime[];
  onChange: (downtimes: Downtime[]) => void;
}

export function DowntimeForm({ downtimes, onChange }: DowntimeFormProps) {
  const addDowntime = () => {
    const newDowntime: Downtime = {
      id: `dt-${Date.now()}`,
      reason: 'Maquinário quebrado',
      duration: 0,
    };
    onChange([...downtimes, newDowntime]);
  };

  const updateDowntime = (id: string, field: keyof Downtime, value: string | number) => {
    onChange(
      downtimes.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const removeDowntime = (id: string) => {
    onChange(downtimes.filter(d => d.id !== id));
  };

  const totalMinutes = downtimes.reduce((sum, d) => sum + d.duration, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Paradas / Downtime</label>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          Total: {totalMinutes} min
        </span>
      </div>

      {downtimes.length === 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] italic">
          Nenhuma parada registrada
        </p>
      )}

      {downtimes.map((downtime, index) => (
        <div
          key={downtime.id}
          className="flex gap-3 items-start p-3 bg-[hsl(var(--muted))] rounded-md"
        >
          <div className="flex-1">
            <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
              Motivo #{index + 1}
            </label>
            <select
              value={downtime.reason}
              onChange={e => updateDowntime(downtime.id, 'reason', e.target.value as DowntimeReason)}
              className="select-field"
            >
              {DOWNTIME_REASONS.map(reason => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div className="w-28">
            <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
              Duração (min)
            </label>
            <input
              type="number"
              min="0"
              value={downtime.duration || ''}
              onChange={e => updateDowntime(downtime.id, 'duration', parseInt(e.target.value) || 0)}
              className="input-field"
              placeholder="0"
            />
          </div>

          <button
            type="button"
            onClick={() => removeDowntime(downtime.id)}
            className="mt-6 text-[hsl(var(--destructive))] hover:text-[hsl(0,75%,45%)] p-1"
            title="Remover"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addDowntime}
        className="btn-secondary w-full"
      >
        + Adicionar Parada
      </button>
    </div>
  );
}
