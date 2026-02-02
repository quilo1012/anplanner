import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, History, LogOut, Settings } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';

export function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/history', label: 'History', icon: History, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];
  
  const filteredNavItems = navItems.filter(item => hasRole(item.roles as any));

  return (
    <aside className="w-60 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col fixed lg:static h-screen shadow-lg">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img
            alt="Applied Nutrition"
            className="h-10 w-auto bg-white rounded p-1"
            src="/lovable-uploads/c9db809b-a260-417c-b42f-c908f00093c1.jpg"
          />
          <div>
            <h1 className="text-sm font-bold leading-tight text-sidebar-foreground">Applied Nutrition</h1>
            <p className="text-xs text-sidebar-foreground/70">Shift Report</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-lg'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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

      {/* User Info */}
      {user && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/70">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}

      {/* Version */}
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
        <p>Production Management</p>
        <p className="mt-1">v1.2.0</p>
      </div>
    </aside>
  );
}