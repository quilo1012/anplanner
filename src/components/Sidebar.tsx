import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, History, LogOut, Settings, Clock, FileBarChart, PanelLeftClose, PanelLeftOpen, Circle } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const onlineUsers = useOnlineUsers();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['supervisor', 'admin'] },
    { path: '/downtime', label: 'Downtime', icon: Clock, roles: ['supervisor', 'admin'] },
    { path: '/history', label: 'History', icon: History, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/weekly-report', label: 'Weekly Report', icon: FileBarChart, roles: ['supervisor', 'admin'] },
    { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];
  
  const filteredNavItems = navItems.filter(item => hasRole(item.roles as any));

  return (
    <aside className={cn(
      "min-h-screen bg-sidebar text-sidebar-foreground flex flex-col fixed lg:static h-screen transition-all duration-300",
      collapsed ? "w-16" : "w-52"
    )}>
      {/* Logo Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3 px-2")}>
          <img
            src="/lovable-uploads/30acb027-2373-44c6-beeb-e940da9f52c7.jpg"
            alt="Applied Nutrition"
            className="h-10 w-auto rounded-lg bg-white p-0.5 shrink-0"
          />
          {!collapsed && (
            <div className="flex-1">
              <h1 className="text-base font-bold leading-tight text-sidebar-foreground">Shift Report</h1>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
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
                  cn(
                    "flex items-center rounded-lg transition-all duration-200",
                    collapsed ? "justify-center px-2 py-3.5" : "gap-3 px-4 py-3.5",
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-lg'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={22} strokeWidth={2} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className={cn("px-3 py-2 border-t border-sidebar-border", collapsed ? "text-center" : "")}>
          {collapsed ? (
            <div className="flex justify-center">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">{onlineUsers.length}</span>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wide mb-1.5">Online ({onlineUsers.length})</p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {onlineUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-2 text-xs text-sidebar-foreground/80">
                    <Circle size={8} className="fill-green-500 text-green-500 shrink-0" />
                    <span className="truncate">{u.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* User Info */}
      {user && (
        <div className="p-4 border-t border-sidebar-border">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </aside>
  );
}
