import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function Layout() {
  const [collapsed] = useLocalStorage('sidebar-collapsed', false);

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Menu */}
      <MobileMenu />
      
      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden pt-14 lg:pt-0 transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-52'}`}>
        <Outlet />
      </main>
    </div>
  );
}
