import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Target, Search, X } from 'lucide-react';
import { ProductSearch } from './ProductSearch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface ProductionTarget {
  id: string;
  product_code: string;
  production_line: string;
  product_description: string | null;
  weight_per_unit: number;
  blender_capacity: number;
  expected_units_per_batch: number;
  expected_units_per_hour: number;
}

interface ProductionTargetsProps {
  open: boolean;
  onClose: () => void;
  lines: string[];
}

export function ProductionTargets({ open, onClose, lines }: ProductionTargetsProps) {
  const [targets, setTargets] = useState<ProductionTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLine, setFilterLine] = useState('');
  const [filterSku, setFilterSku] = useState('');

  // New row state
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLine, setNewLine] = useState('');
  const [newWeight, setNewWeight] = useState(0);
  const [newBlender, setNewBlender] = useState(0);
  const [newUph, setNewUph] = useState(0);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('production_targets')
      .select('*')
      .order('product_code');
    if (error) {
      toast.error('Failed to load production targets');
    } else {
      setTargets((data as any[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchTargets();
  }, [open, fetchTargets]);

  const handleAdd = async () => {
    if (!newCode.trim() || !newLine.trim()) {
      toast.error('Product code and production line are required');
      return;
    }
    const { error } = await supabase.from('production_targets').insert({
      product_code: newCode.trim(),
      production_line: newLine.trim(),
      product_description: newDesc.trim() || null,
      weight_per_unit: newWeight,
      blender_capacity: newBlender,
      expected_units_per_hour: newUph,
    } as any);
    if (error) {
      if (error.code === '23505') {
        toast.error('Target already exists for this SKU + Line combination');
      } else {
        toast.error('Failed to add target');
      }
      return;
    }
    toast.success('Production target added');
    setNewCode(''); setNewDesc(''); setNewLine(''); setNewWeight(0); setNewBlender(0); setNewUph(0);
    fetchTargets();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('production_targets').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete target');
      return;
    }
    setTargets(prev => prev.filter(t => t.id !== id));
    toast.success('Target deleted');
  };

  const handleUpdate = async (target: ProductionTarget, field: string, value: number) => {
    const { error } = await supabase
      .from('production_targets')
      .update({ [field]: value } as any)
      .eq('id', target.id);
    if (error) {
      toast.error('Failed to update');
      return;
    }
    fetchTargets();
  };

  const filtered = targets.filter(t => {
    if (filterLine && !t.production_line.toLowerCase().includes(filterLine.toLowerCase())) return false;
    if (filterSku && !t.product_code.toLowerCase().includes(filterSku.toLowerCase())) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target size={20} className="text-primary" />
            Production Targets
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              value={filterSku}
              onChange={e => setFilterSku(e.target.value)}
              placeholder="Filter by SKU..."
              className="input-field text-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <select
              value={filterLine}
              onChange={e => setFilterLine(e.target.value)}
              className="select-field text-sm"
            >
              <option value="">All Lines</option>
              {lines.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Add new row */}
        <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Add New Target</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <input
              type="text"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              placeholder="SKU Code"
              className="input-field text-sm"
            />
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description"
              className="input-field text-sm"
            />
            <select
              value={newLine}
              onChange={e => setNewLine(e.target.value)}
              className="select-field text-sm"
            >
              <option value="">Select Line</option>
              {lines.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <div className="relative">
              <input type="number" value={newWeight || ''} onChange={e => setNewWeight(parseFloat(e.target.value) || 0)}
                placeholder="Weight" min="0" step="0.001" className="input-field text-sm pr-8" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
            </div>
            <div className="relative">
              <input type="number" value={newBlender || ''} onChange={e => setNewBlender(parseFloat(e.target.value) || 0)}
                placeholder="Blender" min="0" className="input-field text-sm pr-8" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
            </div>
            <button type="button" onClick={handleAdd} className="btn-primary text-sm flex items-center gap-1 justify-center">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground">SKU</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Line</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Weight (kg)</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Blender (kg)</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Units/Batch</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Units/Hour</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center p-6 text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-6 text-muted-foreground">No production targets yet</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-mono font-medium text-primary">{t.product_code}</td>
                  <td className="p-2 text-foreground truncate max-w-[200px]">{t.product_description || '—'}</td>
                  <td className="p-2">{t.production_line}</td>
                  <td className="p-2 text-right">
                    <input type="number" value={t.weight_per_unit} min="0" step="0.001"
                      onChange={e => handleUpdate(t, 'weight_per_unit', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right input-field text-sm p-1" />
                  </td>
                  <td className="p-2 text-right">
                    <input type="number" value={t.blender_capacity} min="0"
                      onChange={e => handleUpdate(t, 'blender_capacity', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right input-field text-sm p-1" />
                  </td>
                  <td className="p-2 text-right font-medium">{t.expected_units_per_batch?.toLocaleString() || '—'}</td>
                  <td className="p-2 text-right">
                    <input type="number" value={t.expected_units_per_hour} min="0"
                      onChange={e => handleUpdate(t, 'expected_units_per_hour', parseFloat(e.target.value) || 0)}
                      className="w-20 text-right input-field text-sm p-1" />
                  </td>
                  <td className="p-2">
                    <button onClick={() => handleDelete(t.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-muted-foreground">
          {filtered.length} target(s) • Units/Batch is auto-calculated from Blender ÷ Weight
        </div>
      </DialogContent>
    </Dialog>
  );
}
