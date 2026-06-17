import { useState } from 'react';
import { useEngineers } from '@/hooks/useEngineers';
import { Header } from '@/components/Header';
import { ChangePinModal } from '@/components/maintenance/ChangePinModal';
import { Loader2, UserCog, Star, KeyRound } from 'lucide-react';

export function Engineers() {
  const { engineers, isLoading, error } = useEngineers();
  const [showChangePin, setShowChangePin] = useState(false);

  return (
    <>
      <Header
        title="Engineers"
        subtitle="Maintenance engineers and their performance scores"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowChangePin(true)} className="btn-secondary text-sm">
            <KeyRound size={14} /> Change My PIN
          </button>
        </div>
        <div className="card p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading engineers...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive text-sm">{error}</div>
          ) : engineers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No active engineers found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {engineers.map(eng => (
                <div key={eng.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UserCog size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{eng.name}</p>
                    {eng.score !== null && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star size={12} className="text-amber-500" /> Score: {eng.score}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ChangePinModal open={showChangePin} onClose={() => setShowChangePin(false)} />
    </>
  );
}

export default Engineers;
