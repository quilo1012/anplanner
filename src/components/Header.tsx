import { ThemeToggle } from '@/components/ThemeToggle';
import { LiveClock } from '@/components/LiveClock';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.pathname !== '/';

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="h-12 sm:h-14 pl-12 pr-3 sm:pr-4 flex items-center justify-between border-l-4 border-primary">
        {/* Left: Back + Title (logo lives in the sidebar to avoid duplication) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {canGoBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wide truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>


        {/* Right: Status + Clock + Theme */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground">Online</span>
          </div>
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          <LiveClock />
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
