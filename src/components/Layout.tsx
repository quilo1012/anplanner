import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <TopNav />
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
