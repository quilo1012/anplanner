import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, History, Users, LogOut, Settings } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import logo from '@/assets/applied-nutrition-logo.png';
export function Sidebar() {
  const {
    user,
    logout,
    hasRole
  } = useAuth();
  const navItems = [{
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['operator', 'supervisor', 'admin']
  }, {
    path: '/planner',
    label: 'Planner',
    icon: ClipboardEdit,
    roles: ['operator', 'supervisor', 'admin']
  }, {
    path: '/history',
    label: 'History',
    icon: History,
    roles: ['operator', 'supervisor', 'admin']
  }, {
    path: '/admin',
    label: 'Admin',
    icon: Settings,
    roles: ['admin']
  }];
  const filteredNavItems = navItems.filter(item => hasRole(item.roles as any));
  return <aside className="w-60 min-h-screen bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-foreground))] flex flex-col fixed lg:static h-screen">
      <div className="p-5 border-b border-[hsl(var(--sidebar-hover))]">
        <div className="flex items-center gap-3">
          <img alt="Applied Nutrition" className="h-10 w-auto bg-white rounded p-1" src="/lovable-uploads/c9db809b-a260-417c-b42f-c908f00093c1.jpg" />
          <div>
            <h1 className="text-sm font-bold leading-tight">Applied Nutrition</h1>
            <p className="text-xs opacity-70">Shift Report</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavItems.map(item => <li key={item.path}>
              <NavLink to={item.path} end={item.path === '/'} className={({
            isActive
          }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-[hsl(var(--sidebar-active))] text-white font-medium shadow-lg shadow-[hsl(var(--sidebar-active))]/30' : 'hover:bg-[hsl(var(--sidebar-hover))] hover:translate-x-1'}`}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>)}
        </ul>
      </nav>

      {/* User info */}
      {user && <div className="p-4 border-t border-[hsl(var(--sidebar-hover))]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--sidebar-active))] flex items-center justify-center font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs opacity-70">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm hover:bg-[hsl(var(--sidebar-hover))] transition-colors">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>}

      <div className="p-4 border-t border-[hsl(var(--sidebar-hover))] text-xs opacity-60">
        <p>Production Management</p>
        <p className="mt-1">v1.1.0</p>
      </div>
    </aside>;
}