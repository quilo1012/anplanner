import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQualityActionTypes } from '@/hooks/useQualityActionTypes';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: string[];
  leaders: string[];
  defaultLine?: string;
  defaultLeader?: string;
  defaultShift?: 'DAY' | 'NIGHT';
  defaultDate?: string;
  recordedBy?: string | null;
  onSaved?: () => void;
}

export function QuickQualityActionDialog({
  open, onOpenChange, leaders,
  defaultLine = '', defaultLeader = '', defaultShift = 'DAY',
  defaultDate, recordedBy, onSaved,
}: Props) {
  const { types, loading: typesLoading } = useQualityActionTypes(true);
  const [actionTypeId, setActionTypeId] = useState('');
  const [line, setLine] = useState(defaultLine);
  const [leader, setLeader] = useState(defaultLeader);
  const [shift, setShift] = useState<'DAY' | 'NIGHT'>(defaultShift);
  const [date, setDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [dbLines, setDbLines] = useState<{ name: string; display_order: number }[]>([]);
  const [linesError, setLinesError] = useState<string | null>(null);
  const [linesLoading, setLinesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLinesError(null);
    setLinesLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('lines')
        .select('name, display_order')
        .order('display_order', { ascending: true });
      setLinesLoading(false);
      if (error) {
        setLinesError(error.message);
        setDbLines([]);
        toast.error(`Failed to load lines: ${error.message}`);
        return;
      }
      setDbLines((data ?? []) as { name: string; display_order: number }[]);
    })();
  }, [open]);


  useEffect(() => {
    if (open) {
      setActionTypeId('');
      setLine(defaultLine);
      setLeader(defaultLeader);
      setShift(defaultShift);
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [open, defaultLine, defaultLeader, defaultShift, defaultDate]);

  const selectedType = useMemo(() => types.find(t => t.id === actionTypeId), [types, actionTypeId]);

  const handleSave = async () => {
    if (!actionTypeId || !line || !leader) {
      toast.error('Select type, line and leader');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('quality_actions')
      .insert({
        action_type_id: actionTypeId,
        production_line: line,
        line_leader: leader,
        date,
        shift_type: shift,
        points: Number(selectedType?.points) || 0,
        notes: notes.trim() || null,
        recorded_by: recordedBy ?? null,
      })
      .select('id');
    setSaving(false);
    if (error || !data || data.length === 0) {
      toast.error(`Failed to save: ${error?.message || 'no rows inserted (RLS?)'}`);
      return;
    }
    toast.success('Quality action recorded');
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Open Quality Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Error Type</Label>
            <Select value={actionTypeId} onValueChange={setActionTypeId} disabled={typesLoading}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Select error type" /></SelectTrigger>
              <SelectContent>
                {types.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} (-{t.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Line</Label>
              <Select value={line} onValueChange={setLine} disabled={linesLoading || !!linesError || dbLines.length === 0}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={linesError ? 'Failed to load lines' : linesLoading ? 'Loading…' : 'Line'} />
                </SelectTrigger>
                <SelectContent>
                  {dbLines.map((l, idx) => (
                    <SelectItem key={l.name} value={l.name}>
                      {idx + 1}. {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linesError && (
                <p className="text-xs text-destructive mt-1">Error loading lines: {linesError}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Leader</Label>
              <Select value={leader} onValueChange={setLeader}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Leader" /></SelectTrigger>
                <SelectContent>
                  {leaders.filter(Boolean).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Date</Label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-8 bg-background border border-border rounded px-2 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Shift</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as 'DAY' | 'NIGHT')}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">DAY</SelectItem>
                  <SelectItem value="NIGHT">NIGHT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Describe the occurrence…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
