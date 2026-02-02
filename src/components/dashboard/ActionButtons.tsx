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
}

function ActionButton({ icon, label, onClick, className }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-all",
        "hover:opacity-90 active:scale-95 shadow-md",
        className
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
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
    <div className="flex flex-wrap gap-2">
      <ActionButton
        icon={<Play size={18} />}
        label="Start Job"
        onClick={onStartJob}
        className="bg-industrial-cyan hover:bg-industrial-cyan/90"
      />
      <ActionButton
        icon={<Square size={18} />}
        label="End Job"
        onClick={onEndJob}
        className="bg-destructive hover:bg-destructive/90"
      />
      <ActionButton
        icon={<Pause size={18} />}
        label="Suspend Job"
        onClick={onSuspendJob}
        className="bg-industrial-purple hover:bg-industrial-purple/90"
      />
      <ActionButton
        icon={<Trash2 size={18} />}
        label="Enter Scrap"
        onClick={onEnterScrap}
        className="bg-industrial-orange hover:bg-industrial-orange/90"
      />
      <ActionButton
        icon={<AlertOctagon size={18} />}
        label="Enter Stop"
        onClick={onEnterStop}
        className="bg-industrial-red hover:bg-industrial-red/90"
      />
    </div>
  );
}
