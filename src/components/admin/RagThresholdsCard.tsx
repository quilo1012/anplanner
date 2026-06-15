import { useEffect, useState } from 'react';
import { Save, Loader2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEFAULT_RAG_THRESHOLDS } from '@/hooks/useRagThresholds';
import { assertMutationSucceeded, formatSupabaseError, runSupabaseQuery } from '@/utils/supabaseSafeQuery';

export function RagThresholdsCard() {
  const [green, setGreen] = useState<number>(DEFAULT_RAG_THRESHOLDS.greenThreshold);
  const [red, setRed] = useState<number>(DEFAULT_RAG_THRESHOLDS.redThreshold);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'rag_thresholds')
        .maybeSingle();
      const v = (data?.value as { greenThreshold?: number; redThreshold?: number } | null) || null;
      if (v) {
        if (typeof v.greenThreshold === 'number') setGreen(v.greenThreshold);
        if (typeof v.redThreshold === 'number') setRed(v.redThreshold);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!Number.isFinite(green) || !Number.isFinite(red)) {
      setError('Both thresholds must be numbers');
      return;
    }
    if (red >= green) {
      setError('Red threshold must be less than Green threshold');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const result = await runSupabaseQuery(
        supabase
          .from('app_settings')
          .upsert({
            key: 'rag_thresholds',
            value: { greenThreshold: green, redThreshold: red },
            updated_by: userData.user?.id ?? null,
          }, { onConflict: 'key' })
          .select('key'),
        'Save RAG thresholds'
      );
      assertMutationSucceeded(result, 'Save RAG thresholds');
      toast.success('RAG thresholds saved');
    } catch (err) {
      const message = formatSupabaseError(err);
      setError(message);
      console.error('[RagThresholdsCard] save failed', err);
      toast.error('Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 sm:p-6 mt-4 sm:mt-6">
      <div className="flex items-center gap-3 mb-4">
        <SlidersHorizontal size={20} className="text-[hsl(var(--primary))]" />
        <h3 className="font-semibold text-[hsl(var(--foreground))]">Line RAG Board thresholds</h3>
      </div>
      {loading ? (
        <div className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Green threshold (variance % ≥)</label>
              <input
                type="number"
                step="0.1"
                value={green}
                onChange={(e) => setGreen(parseFloat(e.target.value))}
                className="input-field"
                required
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Lines with variance at or above this value are Green.</p>
            </div>
            <div>
              <label className="label">Red threshold (variance % &lt;)</label>
              <input
                type="number"
                step="0.1"
                value={red}
                onChange={(e) => setRed(parseFloat(e.target.value))}
                className="input-field"
                required
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Lines with variance below this value are Red. Between the two is Amber.</p>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded text-sm text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </form>
      )}
    </div>
  );
}
