import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function Layout() {
  const [collapsed] = useLocalStorage('sidebar-collapsed', false);

  return;















}