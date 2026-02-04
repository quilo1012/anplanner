import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, LayoutDashboard, ClipboardEdit, History, Settings, LogOut, Factory, Clock } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['operator', 'supervisor', 'admin'] },
    { path: '/downtime', label: 'Downtime', icon: Clock, roles: ['operator', 'supervisor', 'admin'] },
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
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar text-sidebar-foreground z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Factory size={18} className="text-sidebar-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Production Control</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 pt-14">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          
          {/* Menu Panel */}
          <nav className="relative bg-sidebar text-sidebar-foreground w-64 h-full overflow-auto animate-slide-in">
            <ul className="p-3 space-y-1">
              {filteredNavItems.map(item => (
                <li key={item.path}>
                  <NavLink 
                    to={item.path} 
                    end={item.path === '/'} 
                    onClick={handleNavClick} 
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold' 
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent'
                      }`
                    }
                  >
                    <item.icon size={22} strokeWidth={2} />
                    <span className="text-sm">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* User info */}
            {user && (
              <div className="p-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[user.role]}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
                >
                  <LogOut size={18} />
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