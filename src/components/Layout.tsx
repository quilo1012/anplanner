import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SideNav } from './SideNav';

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--background))]">
        <SideNav />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-10 flex items-center border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-2 print:hidden">
            <SidebarTrigger />
          </header>
          <main className="flex-1 min-w-0 flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
