import { CircularProgress } from '@/components/ui/circular-progress';
import { Activity, TrendingUp, Gauge, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  shiftType,
}: OEEPanelProps) {
  const getOEEStatus = () => {
    if (oee >= 85) return { label: 'World Class', color: 'text-success' };
    if (oee >= 75) return { label: 'Good', color: 'text-primary' };
    if (oee >= 60) return { label: 'Average', color: 'text-warning' };
    return { label: 'Needs Improvement', color: 'text-destructive' };
  };

  const oeeStatus = getOEEStatus();

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">
            Shift OEE
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{shiftType} Shift</p>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Main OEE indicator */}
        <div className="flex flex-col items-center">
          <CircularProgress
            value={oee}
            size={110}
            strokeWidth={10}
            label=""
          />
          <div className="text-center mt-2">
            <p className={cn("text-sm font-semibold", oeeStatus.color)}>
              {oeeStatus.label}
            </p>
            <p className="text-xs text-muted-foreground">Overall Equipment Effectiveness</p>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-border" />
        
        {/* Secondary KPIs */}
        <div className="space-y-3">
          <KPIRow
            icon={<TrendingUp size={14} />}
            label="Performance"
            value={performance}
            description="Speed efficiency"
          />
          <KPIRow
            icon={<Gauge size={14} />}
            label="Availability"
            value={availability}
            description="Uptime ratio"
          />
          <KPIRow
            icon={<CheckCircle size={14} />}
            label="Quality"
            value={quality}
            description="Good parts ratio"
          />
        </div>
      </div>
    </div>
  );
}

interface KPIRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}

function KPIRow({ icon, label, value, description }: KPIRowProps) {
  const getColor = () => {
    if (value >= 90) return 'bg-success';
    if (value >= 70) return 'bg-warning';
    return 'bg-destructive';
  };

  const getTextColor = () => {
    if (value >= 90) return 'text-success';
    if (value >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className={cn("text-sm font-bold tabular-nums", getTextColor())}>
            {value.toFixed(1)}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", getColor())}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
