import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardEdit, History, LogOut, Settings,
  FileBarChart, Package, ShieldAlert, Menu, X, Circle,
} from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { cn } from '@/lib/utils';

type NavItem = { path: string; label: string; icon: typeof LayoutDashboard; roles: string[] };

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
  { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['supervisor', 'admin'] },
  { path: '/products', label: 'Products', icon: Package, roles: ['supervisor', 'admin'] },
  { path: '/history', label: 'History', icon: History, roles: ['operator', 'supervisor', 'admin'] },
  { path: '/weekly-report', label: 'Weekly Report', icon: FileBarChart, roles: ['supervisor', 'admin'] },
  { path: '/quality-actions-log', label: 'Quality Log', icon: ShieldAlert, roles: ['supervisor', 'admin'] },
  { path: '/quality-action-types', label: 'Quality Types', icon: ShieldAlert, roles: ['admin'] },
  { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
];

export function TopNav() {
  const { user, logout, hasRole } = useAuth();
  const onlineUsers = useOnlineUsers();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navItems.filter(i => hasRole(i.roles as Parameters<typeof hasRole>[0]));

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    );

  return (
    <header className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground border-b border-sidebar-border print:hidden">
      <div className="flex items-center gap-3 px-3 h-12">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/lovable-uploads/30acb027-2373-44c6-beeb-e940da9f52c7.jpg"
            alt="Applied Nutrition"
            className="h-8 w-auto rounded bg-white p-0.5"
          />
          <span className="hidden sm:inline font-semibold text-sm">Shift Report</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {items.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass}>
              <item.icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Spacer for mobile */}
        <div className="flex-1 lg:hidden" />

        {/* Online users (desktop) */}
        {onlineUsers.length > 0 && (
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md bg-sidebar-accent/40 text-xs">
            <Circle size={8} className="fill-green-500 text-green-500" />
            <span className="text-sidebar-foreground/80">{onlineUsers.length} online</span>
          </div>
        )}

        {/* User (desktop) */}
        {user && (
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs leading-tight">
                <p className="font-medium">{user.name}</p>
                <p className="text-sidebar-foreground/60">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-md hover:bg-sidebar-accent transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-sidebar-border bg-sidebar">
          <nav className="p-2 space-y-0.5">
            {items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={linkClass}
              >
                <item.icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            {user && (
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
              >
                <LogOut size={18} />
                Sign Out ({user.name})
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
