interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] px-6 py-4">
      <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{title}</h1>
      {subtitle && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{subtitle}</p>
      )}
    </header>
  );
}
