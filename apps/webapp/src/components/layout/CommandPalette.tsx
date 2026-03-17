import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { navGroups } from '@/lib/navConfig';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const isInputFocused = (): boolean => {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  if (tag === 'input' || tag === 'textarea') return true;
  if (el.isContentEditable) return true;
  if (role === 'combobox' || role === 'searchbox') return true;
  return false;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      if (isInputFocused()) return;
      const isSlash = e.key === '/';
      const isQuestion = e.key === '?';
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isSlash || isQuestion || isCmdK) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or go to…" aria-label="Search or navigate" />
      <CommandList>
        {navGroups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.to}
                  value={`${group.label} ${item.label} ${item.to}`}
                  onSelect={() => handleSelect(item.to)}
                  aria-label={`Go to ${item.label}`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="border-t px-2 py-1.5 text-xs text-muted-foreground">
        <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">⌘K</kbd>
        <span className="ml-1.5">to open</span>
      </div>
    </CommandDialog>
  );
}
