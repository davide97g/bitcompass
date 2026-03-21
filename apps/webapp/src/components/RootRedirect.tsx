/**
 * Handles "/" — shows the landing page when unauthenticated, redirects to /skills when logged in.
 * Also recovers OAuth callback hash before navigating away.
 */
import { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured } from '@/lib/supabase';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));

const hasOAuthHash = (): boolean =>
  typeof window !== 'undefined' && window.location.hash.includes('access_token');

export function RootRedirect() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    // Let OAuth hash recovery complete first
    if (hasOAuthHash()) return;

    if (!isSupabaseConfigured()) {
      navigate('/skills', { replace: true });
      return;
    }

    if (!isLoading && session) {
      navigate('/skills', { replace: true });
    }
  }, [session, isLoading, navigate]);

  // OAuth callback in progress — wait for session
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

  // Already logged in — blank while redirect fires
  if (session) return null;

  // Loading auth state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not logged in — show landing page
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LandingPage />
    </Suspense>
  );
}
