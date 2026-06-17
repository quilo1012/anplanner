import { useEffect, useState } from 'react';
import { Shield, Edit, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type RoleKey = 'operator' | 'engineer' | 'supervisor' | 'admin';

type RolePermissions = Record<RoleKey, string[]>;

const ROLE_META: { key: RoleKey; label: string; cls: string }[] = [
  { key: 'operator', label: 'Leader (Operator)', cls: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300' },
  { key: 'engineer', label: 'Engineer', cls: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300' },
  { key: 'supervisor', label: 'Supervisor', cls: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300' },
  { key: 'admin', label: 'Manager (Admin)', cls: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' },
];

const DEFAULTS: RolePermissions = {
  operator: [
    'Dashboard access (own data only)',
    'View own shifts and history',
    'Open maintenance work orders (Tablet Kiosk)',
    'View own maintenance requests',
  ],
  engineer: [
    'Work Orders: accept, work, resolve',
    'Engineers and Machines pages',
    'Log maintenance downtime, parts used',
  ],
  supervisor: [
    'Full production access (all lines)',
    'Create, edit, and delete shifts',
    'Add production results and photos',
    'Planner, Products, Weekly Report',
    'Quality Actions Log, Spare Parts',
    'Triage and assign work orders',
  ],
  admin: [
    'All Supervisor permissions',
    'Manage users and assign roles',
    'Quality Action Types, Tablet Setup',
    'System settings (RAG thresholds, etc.)',
  ],
};

export function RolePermissionsCard() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const [data, setData] = useState<RolePermissions>(DEFAULTS);
  const [draft, setDraft] = useState<Record<RoleKey, string>>({} as Record<RoleKey, string>);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'role_permissions')
        .maybeSingle();
      if (row?.value) {
        const v = row.value as Partial<RolePermissions>;
        setData({
          operator: v.operator ?? DEFAULTS.operator,
          engineer: v.engineer ?? DEFAULTS.engineer,
          supervisor: v.supervisor ?? DEFAULTS.supervisor,
          admin: v.admin ?? DEFAULTS.admin,
        });
      }
    })();
  }, []);

  const startEdit = () => {
    setDraft({
      operator: data.operator.join('\n'),
      engineer: data.engineer.join('\n'),
      supervisor: data.supervisor.join('\n'),
      admin: data.admin.join('\n'),
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const parsed: RolePermissions = {
      operator: draft.operator.split('\n').map(s => s.trim()).filter(Boolean),
      engineer: draft.engineer.split('\n').map(s => s.trim()).filter(Boolean),
      supervisor: draft.supervisor.split('\n').map(s => s.trim()).filter(Boolean),
      admin: draft.admin.split('\n').map(s => s.trim()).filter(Boolean),
    };
    const { data: ret, error } = await supabase
      .from('app_settings')
      .upsert({ key: 'role_permissions', value: parsed, updated_by: user?.id ?? null }, { onConflict: 'key' })
      .select('key');
    setSaving(false);
    if (error || !ret?.length) {
      toast.error(error?.message || 'Failed to save permissions');
      return;
    }
    setData(parsed);
    setEditing(false);
    toast.success('Role permissions updated');
  };

  return (
    <div className="card p-4 sm:p-6 mt-4 sm:mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
          <Shield size={20} className="text-[hsl(var(--primary))]" />
          Role Permissions
        </h3>
        {canEdit && !editing && (
          <button onClick={startEdit} className="btn-secondary text-sm flex items-center gap-1">
            <Edit size={14} /> Edit
          </button>
        )}
        {canEdit && editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} disabled={saving} className="btn-secondary text-sm flex items-center gap-1">
              <X size={14} /> Cancel
            </button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLE_META.map(({ key, label, cls }) => (
          <div key={key} className={`p-3 sm:p-4 rounded-lg border ${cls}`}>
            <h4 className="font-medium mb-2 text-sm sm:text-base">{label}</h4>
            {editing ? (
              <textarea
                value={draft[key] ?? ''}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                rows={8}
                className="input-field w-full text-xs sm:text-sm font-mono"
                placeholder="One permission per line"
              />
            ) : (
              <ul className="text-xs sm:text-sm space-y-1 opacity-90">
                {data[key].map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {canEdit && editing && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">
          One bullet per line. Empty lines are ignored.
        </p>
      )}
    </div>
  );
}
