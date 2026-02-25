import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function ensureProfile(user: User) {
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.email ? user.email.split("@")[0] : "User");

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, display_name: displayName }, { onConflict: "user_id" });

  if (error) {
    console.warn("Profile upsert failed:", error.message);
  }
}

function isFetchLikeError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  );
}

async function withNetworkRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isFetchLikeError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = 600 * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let settled = false;

    const settle = (s: Session | null) => {
      if (!isMounted || settled) return;
      settled = true;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) ensureProfile(s.user).catch(console.warn);
    };

    // Failsafe: force loading=false after 8 seconds no matter what
    const failsafeTimer = setTimeout(() => {
      if (!isMounted || settled) return;
      console.warn("[Auth] Failsafe timeout – forcing loading=false");
      settled = true;
      setLoading(false);
    }, 8000);

    // Listen for auth state changes (fires when tokens are set successfully)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      if (!settled) {
        // First auth event settles the initial loading state
        settle(nextSession);
      } else {
        // Subsequent events (e.g. SIGNED_OUT) update state directly
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
    });

    // Try to recover tokens from localStorage as a last resort
    async function recoverFromLocalStorage(): Promise<Session | null> {
      try {
        const storageKey = Object.keys(localStorage).find((k) =>
          k.startsWith("sb-") && k.endsWith("-auth-token")
        );
        if (!storageKey) return null;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const accessToken = parsed?.access_token;
        const refreshToken = parsed?.refresh_token;
        if (!accessToken || !refreshToken) return null;
        console.info("[Auth] Attempting localStorage token recovery…");
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.warn("[Auth] localStorage recovery failed:", error.message);
          return null;
        }
        return data.session;
      } catch {
        return null;
      }
    }

    // Multi-retry session recovery with exponential backoff
    async function resolveSession() {
      const delays = [0, 500, 1500, 3500];
      for (const delay of delays) {
        if (settled) return;
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        if (settled) return;
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            settle(data.session);
            return;
          }
        } catch {
          // continue retrying
        }
      }

      // All getSession retries exhausted – try localStorage recovery
      if (!settled) {
        const recovered = await recoverFromLocalStorage();
        if (recovered) {
          settle(recovered);
          return;
        }
      }

      // No session found after all attempts
      if (!settled) {
        settle(null);
      }
    }

    resolveSession();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await withNetworkRetry(() =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })
    );
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await withNetworkRetry(() =>
      supabase.auth.signInWithPassword({ email, password })
    );
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await withNetworkRetry(() => supabase.auth.signOut());
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
