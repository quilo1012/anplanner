import { useState } from 'react';
import { ShieldAlert, Plus, Edit, Trash2, Save, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQualityActionTypes } from '@/hooks/useQualityActionTypes';
import { QualityActionType, QualitySeverity } from '@/types/quality';
import { SEVERITY_OPTIONS, severityBadgeClass, severityLabel } from '@/utils/qualitySeverity';

export function QualityActionTypesAdmin() {
  const { types, loading, refresh } = useQualityActionTypes(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; points: number; description: string; is_active: boolean; severity: QualitySeverity }>({ name: '', points: 1, description: '', is_active: true, severity: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setForm({ name: '', points: 1, description: '', is_active: true, severity: 'medium' }); setIsAdding(false); setEditingId(null); };

  const startEdit = (t: QualityActionType) => {
    setForm({ name: t.name, points: Number(t.points), description: t.description || '', is_active: t.is_active });
    setEditingId(t.id);
    setIsAdding(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    if (form.points < 0) return toast.error('Points must be ≥ 0');
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      points: form.points,
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('quality_action_types').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('quality_action_types').insert(payload));
    }
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? 'Type updated' : 'Type created');
    reset();
    refresh();
  };

  const toggleActive = async (t: QualityActionType) => {
    const { error } = await supabase.from('quality_action_types').update({ is_active: !t.is_active }).eq('id', t.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (t: QualityActionType) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    const { error } = await supabase.from('quality_action_types').delete().eq('id', t.id);
    if (error) {
      // likely FK violation — fall back to deactivate
      const { error: e2 } = await supabase.from('quality_action_types').update({ is_active: false }).eq('id', t.id);
      if (e2) return toast.error(e2.message);
      toast.warning('Type is in use; deactivated instead.');
    } else {
      toast.success('Type deleted');
    }
    refresh();
  };

  return (
    <div className="card p-4 sm:p-6 mt-4 sm:mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert size={24} className="text-amber-500" />
          <h2 className="text-lg sm:text-xl font-semibold">Quality Action Types</h2>
        </div>
        {!isAdding && !editingId && (
          <button onClick={() => setIsAdding(true)} className="btn-primary w-full sm:w-auto">
            <Plus size={18} /> Add Type
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={submit} className="mb-6 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-4">{editingId ? 'Edit Type' : 'Add New Type'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="label">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required maxLength={120} />
            </div>
            <div>
              <label className="label">Penalty points</label>
              <input type="number" min={0} step="0.5" value={form.points} onChange={e => setForm(f => ({ ...f, points: parseFloat(e.target.value) || 0 }))} className="input-field" required />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Description (optional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" maxLength={300} />
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
              <input id="qat-active" type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="qat-active" className="text-sm">Active</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={reset} className="btn-secondary" disabled={submitting}>
              <X size={16} /> Cancel
            </button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="text-right">Points</th>
              <th>Description</th>
              <th>Status</th>
              <th className="w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</td></tr>
            ) : types.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No quality action types defined.</td></tr>
            ) : types.map(t => (
              <tr key={t.id} className={!t.is_active ? 'opacity-60' : ''}>
                <td className="font-medium">{t.name}</td>
                <td className="text-right font-mono">{t.points}</td>
                <td className="text-sm text-muted-foreground">{t.description || '—'}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(t)} className="p-1.5 text-primary hover:bg-primary/10 rounded" title="Edit"><Edit size={14} /></button>
                    <button onClick={() => toggleActive(t)} className="p-1.5 hover:bg-muted rounded" title={t.is_active ? 'Deactivate' : 'Activate'}>
                      {t.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => remove(t)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
