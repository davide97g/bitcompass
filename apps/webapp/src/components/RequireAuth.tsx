import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured } from '@/lib/supabase';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * When Supabase is configured, redirect to /login if there is no session.
 * When Supabase is not configured, render children (existing simulated auth behavior).
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (isLoading) return;
    if (!session) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [session, isLoading, navigate, location.pathname]);

  if (!isSupabaseConfigured()) return <>{children}</>;
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!session) return null;
  return <>{children}</>;
}
