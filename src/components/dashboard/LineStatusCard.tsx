import { CircularProgress } from '@/components/ui/circular-progress';
import { Factory, Play, Pause, AlertTriangle, User, Package, CheckCircle, XCircle, Target, Clock, Shield, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLineBorderClass, getLineHeaderClass } from '@/utils/lineColors';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration } from '@/utils/formatDuration';
import { NET_SHIFT_MINUTES } from '@/utils/shiftConstants';

interface LineStatusCardProps {
  lineName: string;
  sku: string;
  product: string;
  leader?: string;
  shift?: string;
  performance: number;
  availability: number;
  staffActual?: number;
  staffPlanned?: number;
  status: 'running' | 'stopped' | 'warning';
  colorClass: string;
  realProduction?: number;
  productionTarget?: number;
  leaderQuality?: { occurrences: number; points: number };
  leaderQualityLoading?: boolean;
  onClick?: () => void;
}

export function LineStatusCard({
  lineName,
  sku,
  product,
  leader,
  shift,
  performance,
  availability,
  staffActual = 0,
  staffPlanned = 0,
  status,
  colorClass,
  realProduction = 0,
  productionTarget = 0,
  leaderQuality,
  leaderQualityLoading = false,
  onClick,
}: LineStatusCardProps) {
  // Target comparison
  const hasTargetData = productionTarget > 0;
  const isOnTarget = realProduction >= productionTarget;
  const targetDiff = hasTargetData 
    ? ((realProduction - productionTarget) / productionTarget * 100).toFixed(0)
    : 0;
  const borderStyle = getLineBorderClass(lineName);
  const headerColor = getLineHeaderClass(lineName);
  

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all",
        "border-l-4",
        borderStyle,
        onClick && "cursor-pointer hover:ring-1 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
      )}
      title={onClick ? 'Click to edit shift' : undefined}
    >
      <div className="flex items-stretch">
        {/* Line Header Badge */}
        <div className={cn(
          "flex items-center justify-center px-3 min-w-[80px]",
          headerColor,
          "text-white"
        )}>
          <div className="text-center py-2">
            <Factory size={16} className="mx-auto mb-0.5" />
            <span className="text-[10px] font-bold uppercase tracking-wide block">{lineName}</span>
            {shift && (
              <span className="text-[9px] opacity-80 block">{shift}</span>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {/* Left: Product Info */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Leader Row */}
              {leader && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <User size={10} />
                    {leader}
                  </span>
                  {leaderQualityLoading && (
                    <span
                      aria-label="Loading quality record"
                      className="inline-block h-3.5 w-12 rounded bg-muted animate-pulse"
                    />
                  )}
                  {!leaderQualityLoading && leaderQuality && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold border cursor-default",
                              leaderQuality.occurrences === 0
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-destructive/15 text-destructive border-destructive/30"
                            )}
                          >
                            {leaderQuality.occurrences === 0 ? (
                              <><Shield size={8} />Clean</>
                            ) : (
                              <><ShieldAlert size={8} />-{leaderQuality.points} pts</>
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs space-y-0.5">
                          <p className="font-semibold">{leader}'s quality record (this period)</p>
                          {leaderQuality.occurrences === 0 ? (
                            <p>No quality issues — across all lines worked</p>
                          ) : (
                            <p>{leaderQuality.occurrences} occurrence{leaderQuality.occurrences === 1 ? '' : 's'} · -{leaderQuality.points} pts total</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
              
              {/* SKU and Product */}
              <div className="space-y-0">
                <div className="flex items-center gap-1.5">
                  <Package size={12} className="text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {sku || 'No SKU'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate pl-4" title={product}>
                  {product || 'No product assigned'}
                </p>
              </div>

              {/* Target indicator */}
              {hasTargetData && (
                <div className="flex items-center gap-1.5 pl-4">
                  <Target size={10} className="text-muted-foreground" />
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground">
                      {realProduction.toLocaleString()}/{productionTarget.toLocaleString()}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold",
                      isOnTarget 
                        ? "bg-success/15 text-success border border-success/30" 
                        : "bg-destructive/15 text-destructive border border-destructive/30"
                    )}>
                      {isOnTarget ? (
                        <>
                          <CheckCircle size={8} />
                          +{targetDiff}%
                        </>
                      ) : (
                        <>
                          <XCircle size={8} />
                          {targetDiff}%
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* UPM + Staff inline */}
              <div className="flex items-center gap-3 pl-4 text-[11px] text-muted-foreground">
                {hasTargetData && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {(realProduction / NET_SHIFT_MINUTES).toFixed(1)}/{(productionTarget / NET_SHIFT_MINUTES).toFixed(1)} UPM
                  </span>
                )}
                {(staffPlanned > 0 || staffActual > 0) && (
                  <span className="flex items-center gap-1">
                    Staff:
                    <span className={cn(
                      "font-medium",
                      staffActual < staffPlanned ? "text-warning" : "text-foreground"
                    )}>
                      {staffActual}/{staffPlanned}
                    </span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Right: KPI circle with tooltip */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0 cursor-default">
                    <CircularProgress
                      value={performance}
                      size={44}
                      strokeWidth={4}
                      label="Perf"
                      colorOverride={hasTargetData ? (isOnTarget ? 'success' : 'destructive') : undefined}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs space-y-0.5">
                  <p><strong>Performance:</strong> {performance.toFixed(1)}%</p>
                  {hasTargetData && <p><strong>Target:</strong> {productionTarget.toLocaleString()}</p>}
                  <p><strong>Actual:</strong> {realProduction.toLocaleString()}</p>
                  <p><strong>Availability:</strong> {availability.toFixed(1)}%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
