import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardEdit, History, LogOut, Settings, FileBarChart, Circle, Package, ShieldAlert, ChevronDown, Users, Wrench } from 'lucide-react';
import { useAuth, ROLE_LABELS, UserRole } from '@/contexts/AuthContext';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

type NavEntry =
  | { kind: 'link'; item: NavItem }
  | { kind: 'group'; label: string; icon: typeof LayoutDashboard; items: NavItem[] };

// Top-level links shown directly in the bar, plus grouped dropdowns for Reports/System.
const navEntries: NavEntry[] = [
  { kind: 'link', item: { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] } },
  { kind: 'link', item: { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['supervisor', 'admin'] } },
  { kind: 'link', item: { path: '/products', label: 'Products', icon: Package, roles: ['supervisor', 'admin'] } },
  {
    kind: 'group',
    label: 'Maintenance',
    icon: Wrench,
    items: [
      { path: '/maintenance/work-orders', label: 'Work Orders', icon: Wrench, roles: ['supervisor', 'admin', 'engineer', 'operator'] },
      { path: '/maintenance/engineers', label: 'Engineers', icon: Users, roles: ['supervisor', 'admin', 'engineer'] },
      { path: '/maintenance/machines', label: 'Machines', icon: Package, roles: ['supervisor', 'admin', 'engineer'] },
      { path: '/maintenance/spare-parts', label: 'Spare Parts', icon: Package, roles: ['supervisor', 'admin'] },
    ],
  },
  {
    kind: 'group',
    label: 'Reports',
    icon: FileBarChart,
    items: [
      { path: '/history', label: 'History', icon: History, roles: ['operator', 'supervisor', 'admin'] },
      { path: '/weekly-report', label: 'Weekly Report', icon: FileBarChart, roles: ['supervisor', 'admin'] },
      { path: '/quality-actions-log', label: 'Quality Actions Log', icon: ShieldAlert, roles: ['operator', 'supervisor', 'admin'] },
    ],
  },
  {
    kind: 'group',
    label: 'System',
    icon: Settings,
    items: [
      { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
      { path: '/quality-action-types', label: 'Quality Action Types', icon: ShieldAlert, roles: ['admin'] },
    ],
  },
];

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  );

/**
 * Horizontal top navigation bar (replaces the left Sidebar on lg+ screens).
 * Smaller screens continue to use MobileMenu's hamburger drawer.
 */
export function TopNav() {
  const { user, logout, hasRole } = useAuth();
  const onlineUsers = useOnlineUsers();

  const visibleEntries = navEntries
    .map(entry => entry.kind === 'link'
      ? entry
      : { ...entry, items: entry.items.filter(item => hasRole(item.roles)) })
    .filter(entry => entry.kind === 'link' ? hasRole(entry.item.roles) : entry.items.length > 0);

  return (
    <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2 pr-3 mr-1 border-r border-sidebar-border shrink-0">
          <img
            src="/lovable-uploads/30acb027-2373-44c6-beeb-e940da9f52c7.jpg"
            alt="Applied Nutrition"
            className="h-8 w-auto rounded-md bg-white p-0.5"
          />
          <h1 className="text-sm font-bold leading-tight text-sidebar-foreground hidden sm:block">Shift Report</h1>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {visibleEntries.map(entry => {
            if (entry.kind === 'link') {
              return (
                <NavLink key={entry.item.path} to={entry.item.path} end={entry.item.path === '/'} className={linkClasses}>
                  <entry.item.icon size={16} strokeWidth={2} />
                  <span>{entry.item.label}</span>
                </NavLink>
              );
            }
            return (
              <DropdownMenu key={entry.label}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors whitespace-nowrap">
                    <entry.icon size={16} strokeWidth={2} />
                    <span>{entry.label}</span>
                    <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {entry.items.map(item => (
                    <DropdownMenuItem key={item.path} asChild>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) => cn("flex items-center gap-2 w-full cursor-pointer", isActive && 'font-semibold text-primary')}
                      >
                        <item.icon size={16} strokeWidth={2} />
                        {item.label}
                      </NavLink>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        {/* Online users + user menu */}
        <div className="flex items-center gap-2 pl-2 shrink-0">
          {onlineUsers.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-sidebar-foreground/70 px-2" title={onlineUsers.map(u => u.name).join(', ')}>
              <Circle size={8} className="fill-green-500 text-green-500" />
              <Users size={14} />
              <span>{onlineUsers.length}</span>
            </div>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent transition-colors">
                  <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground text-sm shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium leading-tight text-sidebar-foreground">{user.name}</p>
                    <p className="text-xs text-sidebar-foreground/60 leading-tight">{ROLE_LABELS[user.role]}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">{ROLE_LABELS[user.role]}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
