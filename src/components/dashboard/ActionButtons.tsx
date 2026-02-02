import { Play, Square, Pause, Trash2, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  onStartJob?: () => void;
  onEndJob?: () => void;
  onSuspendJob?: () => void;
  onEnterScrap?: () => void;
  onEnterStop?: () => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  shortLabel?: string;
}

function ActionButton({ icon, label, shortLabel, onClick, className }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all",
        "hover:brightness-110 hover:scale-[1.02] active:scale-95",
        "shadow-md hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
        className
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      <span className="lg:hidden">{shortLabel || label.split(' ')[0]}</span>
    </button>
  );
}

export function ActionButtons({
  onStartJob,
  onEndJob,
  onSuspendJob,
  onEnterScrap,
  onEnterStop,
}: ActionButtonsProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-2 hidden sm:inline">
          Quick Actions:
        </span>
        
        <ActionButton
          icon={<Play size={16} className="fill-current" />}
          label="Start Job"
          shortLabel="Start"
          onClick={onStartJob}
          className="bg-industrial-cyan focus:ring-industrial-cyan"
        />
        <ActionButton
          icon={<Square size={16} className="fill-current" />}
          label="End Job"
          shortLabel="End"
          onClick={onEndJob}
          className="bg-destructive focus:ring-destructive"
        />
        <ActionButton
          icon={<Pause size={16} />}
          label="Suspend Job"
          shortLabel="Suspend"
          onClick={onSuspendJob}
          className="bg-industrial-purple focus:ring-industrial-purple"
        />
        <ActionButton
          icon={<Trash2 size={16} />}
          label="Enter Scrap"
          shortLabel="Scrap"
          onClick={onEnterScrap}
          className="bg-industrial-orange focus:ring-industrial-orange"
        />
        <ActionButton
          icon={<AlertOctagon size={16} />}
          label="Enter Stop"
          shortLabel="Stop"
          onClick={onEnterStop}
          className="bg-industrial-red focus:ring-industrial-red"
        />
      </div>
    </div>
  );
}
