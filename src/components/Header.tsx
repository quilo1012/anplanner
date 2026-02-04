import { ThemeToggle } from '@/components/ThemeToggle';
import { LiveClock } from '@/components/LiveClock';
import { Activity } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-lg sticky top-0 z-40">
      {/* Main Header Row */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-l-4 border-primary">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <img
            alt="Applied Nutrition"
            className="h-9 sm:h-10 w-auto rounded bg-white p-0.5 shrink-0"
            src="/lovable-uploads/30acb027-2373-44c6-beeb-e940da9f52c7.jpg"
          />
          <div className="h-8 w-px bg-border hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground uppercase tracking-wide truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Clock & Theme */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <LiveClock />
          <div className="h-8 w-px bg-border hidden sm:block" />
          <ThemeToggle />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 px-4 sm:px-6 flex items-center justify-between bg-muted/50 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              System Online
            </span>
          </div>
          <div className="h-4 w-px bg-border mx-2 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
            <Activity size={14} />
            <span className="text-xs">Production Monitoring Active</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">
          Shift Report v1.2.0
        </div>
      </div>
    </header>
  );
}
