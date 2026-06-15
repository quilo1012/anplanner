import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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

// Drawer debug: enable via `?drawerDebug=1` or `localStorage.drawerDebug = '1'`.
const drawerDebug = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return (
      new URLSearchParams(window.location.search).get('drawerDebug') === '1' ||
      window.localStorage.getItem('drawerDebug') === '1'
    );
  } catch {
    return false;
  }
})();
const dlog = (...a: unknown[]) => { if (drawerDebug) console.log('[drawer]', ...a); };

export function TopNav() {
  const { user, logout, hasRole } = useAuth();
  const onlineUsers = useOnlineUsers();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Auto-close mobile drawer whenever the route changes (safety net)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll & prevent iOS overscroll/bounce while the mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevBodyOverscroll = document.body.style.overscrollBehavior;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      // Track where each touch started so multi-finger / drift gestures
      // that begin outside the drawer are blocked even if they cross into it.
      const touchOriginInDrawer = new Map<number, boolean>();
      const isInsideDrawer = (target: EventTarget | null) =>
        !!(target instanceof Element && target.closest('[data-mobile-drawer]'));

      const onTouchStart = (e: TouchEvent) => {
        for (const t of Array.from(e.changedTouches)) {
          touchOriginInDrawer.set(t.identifier, isInsideDrawer(t.target));
        }
      };
      const onTouchEnd = (e: TouchEvent) => {
        for (const t of Array.from(e.changedTouches)) touchOriginInDrawer.delete(t.identifier);
      };
      const onTouchMove = (e: TouchEvent) => {
        // If ANY active touch started outside the drawer, block the gesture.
        for (const t of Array.from(e.touches)) {
          if (touchOriginInDrawer.get(t.identifier) === false) {
            e.preventDefault();
            return;
          }
        }
        // Fallback when touchstart wasn't observed (e.g. event began before lock).
        if (!isInsideDrawer(e.target)) e.preventDefault();
      };
      // Block iOS pinch-zoom gestures while drawer is open.
      const onGesture = (e: Event) => e.preventDefault();

      document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
      document.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
      document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
      document.addEventListener('gesturestart', onGesture, { passive: false });
      document.addEventListener('gesturechange', onGesture, { passive: false });

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.overscrollBehavior = prevBodyOverscroll;
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
        document.removeEventListener('touchstart', onTouchStart, { capture: true } as any);
        document.removeEventListener('touchend', onTouchEnd, { capture: true } as any);
        document.removeEventListener('touchcancel', onTouchEnd, { capture: true } as any);
        document.removeEventListener('touchmove', onTouchMove, { capture: true } as any);
        document.removeEventListener('gesturestart', onGesture);
        document.removeEventListener('gesturechange', onGesture);
      };
    }
  }, [mobileOpen]);

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

      {/* Mobile menu + overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-12 z-30 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div data-mobile-drawer className="lg:hidden relative z-40 border-t border-sidebar-border bg-sidebar max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain">
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
        </>
      )}
    </header>
  );
}
