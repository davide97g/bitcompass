import { Button } from '@/components/ui/button';
import { navGroups } from '@/lib/navConfig';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-20 flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-ui ease-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground">
            <Sparkles className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground whitespace-nowrap">
              Bitcompass
            </span>
          )}
        </div>
      </div>

      {/* Navigation - no scroll: sidebar stays static; nav fits or uses internal scroll only */}
      <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-4">
        {navGroups.map((group) => (
          <div
            key={group.label}
            className={cn(
              'space-y-1',
              !collapsed && 'mb-6',
              group.mocked && 'sidebar-group-mocked'
            )}
          >
            {!collapsed && (
              <p
                className={cn(
                  'px-2 mb-2 text-xs font-medium uppercase tracking-wider',
                  group.mocked ? 'text-amber-600/90 dark:text-amber-400/80' : 'text-muted-foreground'
                )}
                title={group.mocked ? 'Mocked – not ready for production' : undefined}
              >
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'sidebar-item',
                    isActive && 'sidebar-item-active',
                    group.mocked && 'sidebar-item-mocked'
                  )}
                  title={collapsed ? item.label : group.mocked ? `${item.label} (mocked)` : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
