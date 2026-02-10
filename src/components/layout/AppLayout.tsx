import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from './CommandPalette';
import { TopBar } from './TopBar';

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
    <div className="flex min-h-screen w-full bg-background">
      <CommandPalette />
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={handleToggleSidebar} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuToggle={handleToggleSidebar} />
        <main className="flex-1 overflow-auto p-6 border-l border-border">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[12rem] text-muted-foreground">
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
