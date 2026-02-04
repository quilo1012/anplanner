import { CircularProgress } from '@/components/ui/circular-progress';
import { Factory, Play, Pause, AlertTriangle, User, Package, CheckCircle, XCircle, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

const LINE_COLORS: Record<string, string> = {
  'Line 1': 'border-l-industrial-blue bg-gradient-to-r from-industrial-blue/5 to-transparent',
  'Line 2': 'border-l-industrial-cyan bg-gradient-to-r from-industrial-cyan/5 to-transparent',
  'Line 3': 'border-l-industrial-purple bg-gradient-to-r from-industrial-purple/5 to-transparent',
  'Line 4': 'border-l-industrial-green bg-gradient-to-r from-industrial-green/5 to-transparent',
  'Line 5': 'border-l-industrial-orange bg-gradient-to-r from-industrial-orange/5 to-transparent',
  'Filler Line 1': 'border-l-industrial-blue bg-gradient-to-r from-industrial-blue/5 to-transparent',
  'Filler Line 2': 'border-l-industrial-cyan bg-gradient-to-r from-industrial-cyan/5 to-transparent',
  'Filler Line 3': 'border-l-industrial-purple bg-gradient-to-r from-industrial-purple/5 to-transparent',
  'Filler Line 4': 'border-l-industrial-green bg-gradient-to-r from-industrial-green/5 to-transparent',
};

const LINE_HEADER_COLORS: Record<string, string> = {
  'Line 1': 'bg-industrial-blue',
  'Line 2': 'bg-industrial-cyan',
  'Line 3': 'bg-industrial-purple',
  'Line 4': 'bg-industrial-green',
  'Line 5': 'bg-industrial-orange',
  'Filler Line 1': 'bg-industrial-blue',
  'Filler Line 2': 'bg-industrial-cyan',
  'Filler Line 3': 'bg-industrial-purple',
  'Filler Line 4': 'bg-industrial-green',
};

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
}: LineStatusCardProps) {
  // Target comparison
  const hasTargetData = productionTarget > 0;
  const isOnTarget = realProduction >= productionTarget;
  const targetDiff = hasTargetData 
    ? ((realProduction - productionTarget) / productionTarget * 100).toFixed(0)
    : 0;
  const borderStyle = LINE_COLORS[lineName] || 'border-l-industrial-blue bg-gradient-to-r from-industrial-blue/5 to-transparent';
  const headerColor = LINE_HEADER_COLORS[lineName] || 'bg-industrial-blue';
  
  const StatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/30">
            <Play size={10} className="fill-current" />
            Running
          </span>
        );
      case 'stopped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive border border-destructive/30">
            <Pause size={10} />
            Stopped
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
            <AlertTriangle size={10} />
            Warning
          </span>
        );
    }
  };

  return (
    <div className={cn(
      "bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all",
      "border-l-4",
      borderStyle
    )}>
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
          <div className="flex items-start justify-between gap-3">
            {/* Left: Product Info */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Status and Leader Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge />
                {leader && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <User size={12} />
                    {leader}
                  </span>
                )}
              </div>
              
              {/* SKU and Product */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-primary shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate">
                    {sku || 'No SKU'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate pl-5" title={product}>
                  {product || 'No product assigned'}
                </p>
              </div>

              {/* Target indicator */}
              {hasTargetData && (
                <div className="flex items-center gap-2 pl-5 mt-1">
                  <Target size={12} className="text-muted-foreground" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {realProduction.toLocaleString()} / {productionTarget.toLocaleString()}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                      isOnTarget 
                        ? "bg-success/15 text-success border border-success/30" 
                        : "bg-destructive/15 text-destructive border border-destructive/30"
                    )}>
                      {isOnTarget ? (
                        <>
                          <CheckCircle size={10} />
                          +{targetDiff}%
                        </>
                      ) : (
                        <>
                          <XCircle size={10} />
                          {targetDiff}%
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* UPM (Units per Minute) */}
              {hasTargetData && (
                <div className="flex items-center gap-2 pl-5 mt-1 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>
                    {(realProduction / 570).toFixed(2)} / {(productionTarget / 570).toFixed(2)} UPM
                  </span>
                </div>
              )}

              {/* Staff indicator */}
              {(staffPlanned > 0 || staffActual > 0) && (
                <div className="flex items-center gap-1 text-xs pl-5">
                  <span className="text-muted-foreground">Staff:</span>
                  <span className={cn(
                    "font-medium",
                    staffActual < staffPlanned ? "text-warning" : "text-foreground"
                  )}>
                    {staffActual}/{staffPlanned}
                  </span>
                </div>
              )}
            </div>
            
            {/* Right: KPI circle */}
            <div className="shrink-0">
              <CircularProgress
                value={performance}
                size={52}
                strokeWidth={5}
                label="Perf"
                colorOverride={hasTargetData ? (isOnTarget ? 'success' : 'destructive') : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
