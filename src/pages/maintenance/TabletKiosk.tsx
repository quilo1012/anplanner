import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useDevicePairing } from '@/hooks/useDevicePairing';
import { useLeaderNames } from '@/hooks/useLeaderNames';
import { useProblemDescriptions } from '@/hooks/useProblemDescriptions';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { toast } from 'sonner';
import { Loader2, Tablet, Plus, Unlink } from 'lucide-react';

function PairingScreen() {
  const { pair } = useDevicePairing();
  const [code, setCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [error, setError] = useState('');

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsPairing(true);
    const result = await pair(code);
    setIsPairing(false);
    if (!result.success) {
      setError(result.error || 'Pairing failed.');
      return;
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={handlePair} className="card p-6 sm:p-8 max-w-sm w-full text-center space-y-4">
        <Tablet size={40} className="mx-auto text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Pair this tablet</h2>
        <p className="text-sm text-muted-foreground">Enter the pairing code given by your admin (Maintenance → Tablet Setup).</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX"
          className="input-field text-center text-lg tracking-widest uppercase"
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={isPairing || !code.trim()} className="btn-primary w-full justify-center">
          {isPairing ? <Loader2 size={16} className="animate-spin" /> : null} Pair Tablet
        </button>
      </form>
    </div>
  );
}

export function TabletKiosk() {
  const { isPaired, pairedLines, unpair } = useDevicePairing();
  const { leaders } = useLeaderNames();
  const { problems } = useProblemDescriptions();
  const { createWorkOrder } = useWorkOrders();

  const [lineId, setLineId] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [problemId, setProblemId] = useState('');
  const [notes, setNotes] = useState('');
  const [lineStopped, setLineStopped] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const problemsByCategory = useMemo(() => {
    const groups = new Map<string, typeof problems>();
    for (const p of problems) {
      const cat = p.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return groups;
  }, [problems]);

  const reset = () => {
    setLineId('');
    setLeaderId('');
    setProblemId('');
    setNotes('');
    setLineStopped(null);
  };

  const handleSubmit = async () => {
    if (!lineId || !leaderId || !problemId) {
      toast.error('Please select line, leader, and problem.');
      return;
    }
    const lineName = pairedLines.find(l => l.id === lineId)?.name || '';
    const leaderName = leaders.find(l => l.id === leaderId)?.name || '';
    const problemName = problems.find(p => p.id === problemId)?.name || '';
    setIsSubmitting(true);
    const result = await createWorkOrder({
      description: problemName,
      lineId,
      lineName,
      priority: 'medium',
      requesterName: leaderName,
      operatorId: leaderId,
      notes: notes.trim() || undefined,
      lineStopped: !!lineStopped,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(`Failed to create work order: ${result.error}`);
      return;
    }
    toast.success('Work order submitted');
    reset();
  };

  if (!isPaired) {
    return (
      <>
        <Header title="Maintenance Tablet" subtitle="Open a work order from this line" />
        <PairingScreen />
      </>
    );
  }

  return (
    <>
      <Header title="Maintenance Tablet" subtitle="Open a work order from this line" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
        {lineStopped === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setLineStopped(true)} className="rounded-xl bg-red-600 hover:bg-red-700 text-white p-5 text-left transition-colors">
              <p className="text-lg font-bold">● MACHINE STOPPED</p>
              <p className="text-sm text-red-100">Line Stopped (downtime starts now)</p>
            </button>
            <button onClick={() => setLineStopped(false)} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white p-5 text-left transition-colors">
              <p className="text-lg font-bold">⚠ PROBLEM, LINE STILL RUNNING</p>
              <p className="text-sm text-amber-100">Line in Operation (no downtime)</p>
            </button>
          </div>
        )}

        {lineStopped !== null && (
          <div className="card p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-1 rounded ${lineStopped ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                {lineStopped ? '● Line Stopped' : '⚠ Line Running'}
              </span>
              <button onClick={() => setLineStopped(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Line *</label>
              <select value={lineId} onChange={(e) => setLineId(e.target.value)} className="input-field">
                <option value="">Select line...</option>
                {pairedLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Requested By (Leader) *</label>
              <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)} className="input-field">
                <option value="">Select leader...</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Problem Type *</label>
              <select value={problemId} onChange={(e) => setProblemId(e.target.value)} className="input-field">
                <option value="">Select problem...</option>
                {Array.from(problemsByCategory.entries()).map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Additional notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} />
            </div>

            <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary w-full justify-center">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Submit Work Order
            </button>
          </div>
        )}

        <button onClick={unpair} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 mx-auto">
          <Unlink size={12} /> Unpair this tablet
        </button>
      </div>
    </>
  );
}
