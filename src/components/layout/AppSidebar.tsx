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
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="w-5 h-5" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground whitespace-nowrap">
              Knowledge Hub
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className={cn('space-y-1', !collapsed && 'mb-6')}>
            {!collapsed && (
              <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                    isActive && 'sidebar-item-active'
                  )}
                  title={collapsed ? item.label : undefined}
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
