import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, History } from 'lucide-react';
import logo from '@/assets/applied-nutrition-logo.png';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/planner', label: 'Planner', icon: ClipboardEdit },
  { path: '/history', label: 'History', icon: History },
];

export function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] flex flex-col">
      <div className="p-5 border-b border-[hsl(var(--sidebar-hover))]">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Applied Nutrition" className="h-10 w-auto bg-white rounded p-1" />
          <div>
            <h1 className="text-sm font-bold leading-tight">Applied Nutrition</h1>
            <p className="text-xs opacity-70">Shift Report</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[hsl(var(--sidebar-active))] text-white font-medium shadow-lg shadow-[hsl(var(--sidebar-active))]/30'
                      : 'hover:bg-[hsl(var(--sidebar-hover))] hover:translate-x-1'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-[hsl(var(--sidebar-hover))] text-xs opacity-60">
        <p>Production Management</p>
        <p className="mt-1">v1.0.0</p>
      </div>
    </aside>
  );
}
