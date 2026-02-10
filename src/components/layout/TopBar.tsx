import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { searchAll } from '@/data/mockData';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchResults } from './SearchResults';

const getUserAvatarUrl = (user: { user_metadata?: Record<string, unknown> } | null): string | undefined => {
  if (!user?.user_metadata) return undefined;
  const meta = user.user_metadata as Record<string, string | undefined>;
  return meta.avatar_url ?? meta.picture;
};

const getUserInitials = (user: { user_metadata?: Record<string, unknown>; email?: string | null } | null): string => {
  if (!user) return '?';
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const fullName = meta.full_name ?? meta.name;
  if (fullName && typeof fullName === 'string') {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }
  const email = user.email;
  if (email) {
    const local = email.split('@')[0] ?? '';
    return local.slice(0, 2).toUpperCase() || '?';
  }
  return '?';
};

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const avatarUrl = getUserAvatarUrl(user);
  const initials = getUserInitials(user);

  const searchResults = searchQuery.length > 1 ? searchAll(searchQuery) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (type: string, id: string) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(`/${type}/${id}`);
  };

  return (
    <header className="relative z-[30] flex items-center h-16 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Mobile menu toggle */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden mr-2"
        onClick={onMenuToggle}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Search */}
      <div ref={searchRef} className="relative flex-1 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search people, projects, problems, skills..."
          className="pl-10 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1 rounded-lg"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
        
        {/* Search Results Dropdown */}
        {showResults && searchResults && searchResults.hasResults && (
          <SearchResults 
            results={searchResults} 
            onResultClick={handleResultClick}
            onClose={() => setShowResults(false)}
          />
        )}
      </div>

      {/* User avatar with dropdown - pushed to top right */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Open user menu"
            >
              <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all duration-ui ease-out">
                <AvatarImage src={avatarUrl} alt={user?.user_metadata?.full_name as string ?? 'User'} />
                <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium leading-none">
                  {(user?.user_metadata?.full_name as string) ?? 'User'}
                </p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void signOut()}
              className="cursor-pointer text-destructive focus:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
