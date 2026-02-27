import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from './CommandPalette';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'app-sidebar-collapsed';

const getInitialSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed);

  const handleToggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // ignore quota or private browsing
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background dark:bg-zinc-950">
      <CommandPalette />
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
      />
      <div
        className={cn(
          'flex flex-col min-h-screen min-w-0 flex-1 dark:bg-midnight-aurora',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <TopBar onMenuToggle={handleToggleSidebar} />
        <main className="flex-1 overflow-auto p-6 border-l border-border dark:border-white/10 relative">
          <Suspense
            fallback={
              <div className="items-center justify-center min-h-[12rem] flex text-muted-foreground">
                Loading…
              </div>
            }
          >
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
