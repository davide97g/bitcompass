import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const parseHashParams = (hash: string): Record<string, string> => {
  const params: Record<string, string> = {};
  if (!hash || !hash.startsWith('#')) return params;
  const query = hash.slice(1);
  for (const part of query.split('&')) {
    const [key, value] = part.split('=');
    if (key && value) params[key] = decodeURIComponent(value);
  }
  return params;
};

export const useAuth = (): {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
} => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Recover session from OAuth redirect hash (e.g. .../#access_token=...&refresh_token=...)
  useEffect(() => {
    if (!supabase || typeof window === 'undefined') return;
    const params = parseHashParams(window.location.hash);
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;
    if (accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data: { session: s } }) => {
          setSession(s);
          setUser(s?.user ?? null);
          setIsLoading(false);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        })
        .catch(() => {
          setIsLoading(false);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        });
      return;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    const hasOAuthHash =
      typeof window !== 'undefined' && window.location.hash.includes('access_token');
    if (!hasOAuthHash) {
      void supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return { user, session, isLoading, signInWithGoogle, signOut };
};
