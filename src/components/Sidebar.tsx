import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, History, LogOut, Settings, Factory, Clock } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';

export function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/downtime', label: 'Downtime', icon: Clock, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/history', label: 'History', icon: History, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];
  
  const filteredNavItems = navItems.filter(item => hasRole(item.roles as any));

  return (
    <aside className="w-52 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col fixed lg:static h-screen">
      {/* Logo Header */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            src="/lovable-uploads/30acb027-2373-44c6-beeb-e940da9f52c7.jpg"
            alt="Applied Nutrition"
            className="h-10 w-auto rounded-lg bg-white p-0.5"
          />
          <div>
            <h1 className="text-base font-bold leading-tight text-sidebar-foreground">Shift Report</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {filteredNavItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-lg'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
              >
                <item.icon size={22} strokeWidth={2} />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info */}
      {user && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
        <p>© 2026 Applied Nutrition. All rights reserved.</p>
      </div>
    </aside>
  );
}