import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';

export function Layout() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-start">
      {/* Desktop Sidebar (sits in flex flow on lg, so no extra margin needed) */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Menu */}
      <MobileMenu />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}