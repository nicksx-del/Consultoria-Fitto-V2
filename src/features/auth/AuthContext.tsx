import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      authEventReceived = true;
      if (mounted) {
        setSession(next);
        setLoading(false);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted && !authEventReceived) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    async function handleUrl(url: string | null) {
      if (!url || !url.startsWith('fittov2:')) return;
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const values = new URLSearchParams(fragment);
      const access_token = values.get('access_token');
      const refresh_token = values.get('refresh_token');
      if (access_token && refresh_token)
        await supabase.auth.setSession({ access_token, refresh_token });
    }
    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {});
    const links = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url).catch(() => {});
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
      appState.remove();
      links.remove();
    };
  }, []);
  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
