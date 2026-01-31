import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <img
          alt="Applied Nutrition"
          className="h-10 w-auto"
          src="/lovable-uploads/30acb027-2373-44c6-beeb-e940da9f52c7.jpg"
        />
        <div className="border-l border-border pl-4">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-sm text-muted-foreground hidden sm:inline">Shift Report App</span>
      </div>
    </header>
  );
}
