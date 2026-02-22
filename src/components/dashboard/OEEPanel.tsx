import { CircularProgress } from '@/components/ui/circular-progress';
import { Activity, TrendingUp, Package, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OEEPanelProps {
  performance: number;
  availability: number;
  oee: number;
  shiftType: string;
  totalProduction?: number;
  totalPlanned?: number;
}

export function OEEPanel({
  performance,
  availability,
  oee,
  shiftType,
  totalProduction = 0,
  totalPlanned = 0,
}: OEEPanelProps) {
  const hasData = totalProduction > 0 || totalPlanned > 0;
  const perfValue = totalPlanned > 0 ? (totalProduction / totalPlanned) * 100 : null;

  const getOEEStatus = () => {
    if (perfValue === null) return { label: '—', color: 'text-muted-foreground', colorKey: undefined as 'success' | 'warning' | 'destructive' | undefined };
    if (perfValue >= 100) return { label: 'World Class', color: 'text-success', colorKey: 'success' as const };
    if (perfValue >= 90) return { label: 'On Target', color: 'text-warning', colorKey: 'warning' as const };
    return { label: 'Below Target', color: 'text-destructive', colorKey: 'destructive' as const };
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
        {!hasData ? (
          <div className="text-center py-4">
            <Package size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No production data for selected period</p>
          </div>
        ) : (
          <>
            {/* Main OEE indicator */}
            <div className="flex flex-col items-center">
              <CircularProgress
                value={perfValue !== null ? Math.min(perfValue, 200) : 0}
                size={110}
                strokeWidth={10}
                label=""
                colorOverride={oeeStatus.colorKey}
                showValue={perfValue !== null}
              />
              <div className="text-center mt-2">
                {perfValue !== null ? (
                  <>
                    <p className={cn("text-lg font-bold tabular-nums", oeeStatus.color)}>
                      {perfValue.toFixed(1)}%
                    </p>
                    <p className={cn("text-sm font-semibold", oeeStatus.color)}>
                      {oeeStatus.label}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">—</p>
                )}
                <p className="text-xs text-muted-foreground">Overall Performance</p>
              </div>
            </div>
            
            {/* Divider */}
            <div className="border-t border-border" />
            
            {/* KPI rows */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-primary shrink-0"><Package size={14} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Produced</span>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {totalProduction.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Units produced</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-muted-foreground shrink-0"><Target size={14} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Planned</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {totalPlanned.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Units planned</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="text-muted-foreground shrink-0"><TrendingUp size={14} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">Performance</span>
                    <span className={cn("text-sm font-bold tabular-nums", perfValue !== null ? oeeStatus.color : 'text-muted-foreground')}>
                      {perfValue !== null ? `${perfValue.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  {perfValue !== null && (
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500",
                          perfValue >= 100 ? 'bg-success' : perfValue >= 90 ? 'bg-warning' : 'bg-destructive'
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, perfValue))}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">Speed efficiency</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
