import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/planner', label: 'Planner', icon: '📝' },
  { path: '/history', label: 'Histórico', icon: '📋' },
];

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] flex flex-col">
      <div className="p-4 border-b border-[hsl(var(--sidebar-hover))]">
        <h1 className="text-lg font-bold">⚙️ Shift Report</h1>
        <p className="text-xs text-[hsl(var(--sidebar-foreground))] opacity-70 mt-1">
          Gestão de Produção
        </p>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-[hsl(var(--sidebar-active))] text-white font-medium'
                      : 'hover:bg-[hsl(var(--sidebar-hover))]'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-[hsl(var(--sidebar-hover))] text-xs opacity-60">
        Shift Report App v1.0
      </div>
    </aside>
  );
}
