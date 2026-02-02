import { CircularProgress } from '@/components/ui/circular-progress';
import { Factory, Play, Pause, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineStatusCardProps {
  lineName: string;
  sku: string;
  product: string;
  performance: number;
  availability: number;
  status: 'running' | 'stopped' | 'warning';
  colorClass: string;
}

const LINE_COLORS: Record<string, string> = {
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
  performance,
  availability,
  status,
  colorClass,
}: LineStatusCardProps) {
  const borderColor = LINE_COLORS[lineName] || 'bg-industrial-blue';
  
  const StatusIcon = () => {
    switch (status) {
      case 'running':
        return <Play size={16} className="text-success fill-success" />;
      case 'stopped':
        return <Pause size={16} className="text-destructive" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-warning" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Color accent bar */}
      <div className={cn("h-1.5", borderColor || colorClass)} />
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Line info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Factory size={18} className="text-muted-foreground shrink-0" />
              <h3 className="font-bold text-foreground truncate">{lineName}</h3>
              <StatusIcon />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">SKU:</span> {sku || '-'}
              </p>
              <p className="text-xs text-muted-foreground truncate" title={product}>
                {product || 'No product assigned'}
              </p>
            </div>
          </div>
          
          {/* Right: KPI circles */}
          <div className="flex items-center gap-3">
            <CircularProgress
              value={performance}
              size={56}
              strokeWidth={6}
              label="Perf"
            />
            <CircularProgress
              value={availability}
              size={56}
              strokeWidth={6}
              label="Avail"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
