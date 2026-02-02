import { CircularProgress } from '@/components/ui/circular-progress';
import { Activity } from 'lucide-react';

interface OEEPanelProps {
  performance: number;
  availability: number;
  quality: number;
  oee: number;
  shiftType: string;
}

export function OEEPanel({
  performance,
  availability,
  quality,
  oee,
}: OEEPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <Activity size={20} className="text-primary" />
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">
          Shift OEE
        </h3>
      </div>
      
      <div className="space-y-4">
        {/* Main OEE indicator */}
        <div className="flex justify-center">
          <CircularProgress
            value={oee}
            size={100}
            strokeWidth={10}
            label="OEE"
          />
        </div>
        
        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <CircularProgress
            value={performance}
            size={64}
            strokeWidth={6}
            label="Perf"
          />
          <CircularProgress
            value={availability}
            size={64}
            strokeWidth={6}
            label="Avail"
          />
          <CircularProgress
            value={quality}
            size={64}
            strokeWidth={6}
            label="Quality"
          />
        </div>
      </div>
    </div>
  );
}
