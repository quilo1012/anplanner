import logo from '@/assets/applied-nutrition-logo.png';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <img src={logo} alt="Applied Nutrition" className="h-10 w-auto" />
        <div className="border-l border-[hsl(var(--border))] pl-4">
          <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="text-sm text-[hsl(var(--muted-foreground))]">
        Shift Report App
      </div>
    </header>
  );
}
