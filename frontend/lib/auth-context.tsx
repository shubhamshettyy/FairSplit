"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  configured: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("./supabase");
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setSession(data.session);
          setLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
          if (!cancelled) {
            setSession(sess);
            setLoading(false);
          }
        });

        return () => { cancelled = true; subscription.unsubscribe(); };
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    const { supabase } = await import("./supabase");
    await supabase.auth.signOut();
    setSession(null);
  }, [configured]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured,
      signOut,
    }),
    [session, loading, configured, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
