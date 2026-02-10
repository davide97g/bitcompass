/**
 * Handles "/" so we don't navigate away before recovering OAuth callback hash.
 * When URL has #access_token=..., we stay here until useAuth sets the session, then redirect.
 */
import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const hasOAuthHash = (): boolean =>
  typeof window !== 'undefined' && window.location.hash.includes('access_token');

export function RootRedirect() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      navigate('/home', { replace: true });
      return;
    }
    if (session) {
      navigate('/home', { replace: true });
      return;
    }
    if (!hasOAuthHash() && !isLoading) {
      navigate('/home', { replace: true });
      return;
    }
    if (hasOAuthHash()) {
      const t = window.setTimeout(() => {
        if (!hasOAuthHash()) return;
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        navigate('/home', { replace: true });
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [session, isLoading, navigate]);

  if (hasOAuthHash()) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background"
        role="status"
        aria-label="Completing sign in"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
