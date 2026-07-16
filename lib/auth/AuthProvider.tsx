"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "../types";
import { IS_MOCK, SITE_URL } from "../config";
import { ensureDemoUser, mockAuth } from "./mockAuth";
import { createClient } from "../supabase/client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isMock: boolean;
  demoCredentials: { email: string; password: string } | null;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // ---- MOCK MODE -----------------------------------------------------------
  useEffect(() => {
    if (!IS_MOCK) return;
    ensureDemoUser();
    setUser(mockAuth.getCurrentUser());
    setLoading(false);
  }, []);

  // ---- SUPABASE MODE -------------------------------------------------------
  useEffect(() => {
    if (IS_MOCK) return;
    const supabase = createClient();
    supabaseRef.current = supabase;

    const mapUser = (u: {
      id: string;
      email?: string;
      user_metadata?: { full_name?: string };
    } | null): AuthUser | null =>
      u
        ? {
            id: u.id,
            email: u.email ?? "",
            full_name: u.user_metadata?.full_name ?? "",
          }
        : null;

    supabase.auth.getUser().then(({ data }) => {
      setUser(mapUser(data.user));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null));
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      if (IS_MOCK) {
        const u = await mockAuth.signUp(fullName, email, password);
        setUser(u);
        return { needsConfirmation: false };
      }
      const supabase = supabaseRef.current ?? createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${SITE_URL}/login`,
        },
      });
      if (error) throw new Error(error.message);
      // When email confirmation is disabled, signUp returns a live session and
      // onAuthStateChange logs the user straight in.
      return { needsConfirmation: !data.session };
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (IS_MOCK) {
      const u = await mockAuth.signIn(email, password);
      setUser(u);
      return;
    }
    const supabase = supabaseRef.current ?? createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    if (IS_MOCK) {
      await mockAuth.signOut();
      setUser(null);
      return;
    }
    const supabase = supabaseRef.current ?? createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (IS_MOCK) {
      await mockAuth.resetPassword(email);
      return;
    }
    const supabase = supabaseRef.current ?? createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (IS_MOCK) return; // no-op in mock mode
    const supabase = supabaseRef.current ?? createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isMock: IS_MOCK,
      demoCredentials: IS_MOCK ? mockAuth.demoCredentials() : null,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, loading, signUp, signIn, signOut, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
