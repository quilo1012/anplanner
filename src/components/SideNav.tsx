import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardEdit, History, LogOut, Settings,
  FileBarChart, Package, ShieldAlert, Circle, Trophy, Wrench, ChevronDown, Users,
} from 'lucide-react';
import { useAuth, ROLE_LABELS, UserRole } from '@/contexts/AuthContext';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { useMySidebarStats } from '@/hooks/useMySidebarStats';
import { cn } from '@/lib/utils';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

type NavItem = { path: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] };

const directItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['operator', 'supervisor', 'admin'] },
  { path: '/planner', label: 'Planner', icon: ClipboardEdit, roles: ['supervisor', 'admin'] },
  { path: '/products', label: 'Products', icon: Package, roles: ['supervisor', 'admin'] },
];
const maintenanceItems: NavItem[] = [
  { path: '/maintenance/work-orders', label: 'Work Orders', icon: Wrench, roles: ['supervisor', 'admin', 'engineer', 'operator'] },
  { path: '/maintenance/engineers', label: 'Engineers', icon: Users, roles: ['supervisor', 'admin', 'engineer'] },
  { path: '/maintenance/machines', label: 'Machines', icon: Package, roles: ['supervisor', 'admin', 'engineer'] },
  { path: '/maintenance/spare-parts', label: 'Spare Parts', icon: Package, roles: ['supervisor', 'admin'] },
];
const reportsItems: NavItem[] = [
  { path: '/history', label: 'History', icon: History, roles: ['operator', 'supervisor', 'admin'] },
  { path: '/weekly-report', label: 'Weekly Report', icon: FileBarChart, roles: ['supervisor', 'admin'] },
  { path: '/quality-actions-log', label: 'Quality Actions Log', icon: ShieldAlert, roles: ['supervisor', 'admin'] },
  { path: '/leader-quality', label: 'Leader Quality Board', icon: Trophy, roles: ['supervisor', 'admin'] },
];
const systemItems: NavItem[] = [
  { path: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
  { path: '/quality-action-types', label: 'Quality Action Types', icon: ShieldAlert, roles: ['admin'] },
];

export function SideNav() {
  const { user, logout, hasRole } = useAuth();
  const onlineUsers = useOnlineUsers();
  const { stats } = useMySidebarStats(user?.name);
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { pathname } = useLocation();

  const filt = (items: NavItem[]) => items.filter(i => hasRole(i.roles));
  const isActive = (p: string) => p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/');

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = filt(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map(item => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.label}>
                  <NavLink to={item.path} end={item.path === '/'}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn('flex items-center gap-2 px-2 py-1.5', collapsed && 'justify-center px-0')}>
          <img
            src="/lovable-uploads/30acb027-2373-44c6-beeb-e940da9f52c7.jpg"
            alt="Applied Nutrition"
            className="h-8 w-8 rounded bg-white p-0.5 shrink-0 object-contain"
          />
          {!collapsed && <span className="font-semibold text-sm truncate">Shift Report</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup('Main', directItems)}
        {renderGroup('Maintenance', maintenanceItems)}
        {renderGroup('Reports', reportsItems)}
        {renderGroup('System', systemItems)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="px-2 py-1.5 space-y-1 border-b border-sidebar-border/60">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">My activity</p>
            <NavLink
              to={`/quality-actions-log?leader=${encodeURIComponent(user.name)}`}
              className="flex items-center justify-between gap-2 text-xs px-1.5 py-1 rounded hover:bg-sidebar-accent"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-amber-500" />
                Quality actions
              </span>
              <span className={cn(
                'tabular-nums font-medium',
                stats.qualityActions > 0 ? 'text-amber-500' : 'text-sidebar-foreground/60'
              )}>
                {stats.qualityActions}{stats.qualityPoints !== 0 && (
                  <span className="ml-1 text-sidebar-foreground/50">({stats.qualityPoints > 0 ? '+' : ''}{stats.qualityPoints})</span>
                )}
              </span>
            </NavLink>
            <NavLink
              to="/maintenance/work-orders"
              className="flex items-center justify-between gap-2 text-xs px-1.5 py-1 rounded hover:bg-sidebar-accent"
            >
              <span className="flex items-center gap-1.5">
                <Wrench size={12} className="text-red-500" />
                Open WOs
              </span>
              <span className={cn(
                'tabular-nums font-medium',
                stats.openWorkOrders > 0 ? 'text-red-500' : 'text-sidebar-foreground/60'
              )}>
                {stats.openWorkOrders}
              </span>
            </NavLink>
          </div>
        )}
        {!collapsed && onlineUsers.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-sidebar-foreground/70">
            <Circle size={8} className="fill-green-500 text-green-500" />
            <span>{onlineUsers.length} online</span>
          </div>
        )}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors outline-none',
                collapsed && 'justify-center px-0'
              )}
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="text-xs leading-tight text-left flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sidebar-foreground/60 truncate">{ROLE_LABELS[user.role]}</p>
                  </div>
                  <ChevronDown size={14} className="text-sidebar-foreground/70 shrink-0" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="bg-sidebar text-sidebar-foreground border-sidebar-border">
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut size={16} className="mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
