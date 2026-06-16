import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SideNav } from './SideNav';

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--background))]">
        <SideNav />
        <div className="flex-1 min-w-0 flex flex-col relative">
          {/* Floating sidebar trigger sits over the page header so we don't waste a row */}
          <SidebarTrigger className="absolute left-2 top-2 z-50 print:hidden" />
          <main className="flex-1 min-w-0 flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
