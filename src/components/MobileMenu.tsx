import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, LayoutDashboard, ClipboardEdit, History, Settings, LogOut } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import logo from '@/assets/applied-nutrition-logo.png';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/history', label: 'History', icon: History, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => hasRole(item.roles as any));

  const handleNavClick = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[hsl(var(--sidebar-bg))] text-white z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Applied Nutrition" className="h-8 w-auto bg-white rounded p-0.5" />
          <span className="font-semibold text-sm">Shift Report</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-[hsl(var(--sidebar-hover))] rounded-lg transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <nav className="relative bg-[hsl(var(--sidebar-bg))] text-white w-64 h-full overflow-auto animate-slide-in">
            <ul className="p-4 space-y-2">
              {filteredNavItems.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-[hsl(var(--sidebar-active))] font-medium'
                          : 'hover:bg-[hsl(var(--sidebar-hover))]'
                      }`
                    }
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* User info */}
            {user && (
              <div className="p-4 border-t border-[hsl(var(--sidebar-hover))]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--sidebar-active))] flex items-center justify-center font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs opacity-70">{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm hover:bg-[hsl(var(--sidebar-hover))] transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
