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
import { useRulesSearch } from '@/hooks/use-rules';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createCredential, getWebAuthnErrorMessage, hasStoredCredential, removeCredential } from '@/lib/webauthn-app-lock';
import { Fingerprint, LogOut, Menu, Search, ShieldOff } from 'lucide-react';
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
  const [biometricLoading, setBiometricLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const hasBiometric = hasStoredCredential();
  const avatarUrl = getUserAvatarUrl(user);
  const initials = getUserInitials(user);

  const searchResults = searchQuery.length > 1 ? searchAll(searchQuery) : null;
  const { data: rulesResults = [] } = useRulesSearch(searchQuery);
  const hasAnyResults =
    (searchResults?.hasResults ?? false) || rulesResults.length > 0;
  const mergedResults = searchResults
    ? { ...searchResults, rules: rulesResults }
    : {
        people: [],
        topics: [],
        problems: [],
        projects: [],
        automations: [],
        rules: rulesResults,
        hasResults: rulesResults.length > 0,
      };

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
    if (type === 'rules') {
      navigate(`/rules/${id}`);
      return;
    }
    navigate(`/${type}/${id}`);
  };

  const handleEnableBiometric = async () => {
    setBiometricLoading(true);
    try {
      await createCredential();
      window.location.reload();
    } catch (err) {
      toast({
        title: getWebAuthnErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleRemoveBiometric = () => {
    removeCredential();
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-border bg-background px-4 shadow-sm dark:bg-zinc-950">
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
          placeholder="Search people, projects, problems, rules, solutions, skills, commands..."
          className="pl-10 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1 rounded-lg"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
        
        {/* Search Results Dropdown */}
        {showResults && hasAnyResults && (
          <SearchResults
            results={mergedResults}
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
            {hasBiometric ? (
              <DropdownMenuItem
                onSelect={handleRemoveBiometric}
                className="cursor-pointer"
                aria-label="Rimuovi blocco biometrico"
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Rimuovi biometrico
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => void handleEnableBiometric()}
                disabled={biometricLoading}
                className="cursor-pointer"
                aria-label="Attiva blocco biometrico"
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                {biometricLoading ? 'Configurazione…' : 'Attiva biometrico'}
              </DropdownMenuItem>
            )}
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
