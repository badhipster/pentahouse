// Auth context for the Pentahouse dashboard.
//
// Provides:
//   - useAuth() hook — { session, user, profile, loading, signIn, signUp, signOut }
//   - <AuthProvider> — wraps the app, subscribes to Supabase auth changes
//   - <RequireAuth> — render-gate that redirects unauthenticated users to /login
//
// Multi-persona ready: profile.role is exposed so future route gates can
// branch on sales_head / marketing / sales_rep / aggregator.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserProfile = {
  id: string;
  email: string;
  display_name: string;
  role: 'sales_head' | 'marketing' | 'sales_rep' | 'aggregator' | 'admin';
  avatar_url: string | null;
  phone: string | null;
  tenant_id: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user profile from our public.users table
  async function fetchProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[auth.fetchProfile]', error);
      return null;
    }
    return data as UserProfile | null;
  }

  useEffect(() => {
    // Initial session check on app load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be called inside <AuthProvider>. Wrap your app root with it.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Role helpers — keep persona logic out of components
// ---------------------------------------------------------------------------

export type Role = UserProfile['role'];

// What each role is allowed to see across the app.
// Single source of truth — add new routes here, not in components.
const ROLE_CAPABILITIES: Record<Role, {
  routes: Set<string>;
  showsCampaigns: boolean;
  showsAllLeads: boolean;     // false => filter by assigned_to = self
  showsInventoryEdit: boolean;
  showsApprovals: boolean;
  showsAnalytics: boolean;
}> = {
  sales_head: {
    routes: new Set(['/', '/leads', '/visits', '/approvals', '/properties', '/analytics', '/agents', '/campaigns']),
    showsCampaigns: true,
    showsAllLeads: true,
    showsInventoryEdit: true,
    showsApprovals: true,
    showsAnalytics: true,
  },
  sales_rep: {
    routes: new Set(['/', '/leads', '/visits', '/approvals']),
    showsCampaigns: false,
    showsAllLeads: false,
    showsInventoryEdit: false,
    showsApprovals: true,
    showsAnalytics: false,
  },
  marketing: {
    routes: new Set(['/', '/properties', '/analytics', '/campaigns']),
    showsCampaigns: true,
    showsAllLeads: false,
    showsInventoryEdit: true,
    showsApprovals: false,
    showsAnalytics: true,
  },
  // Aggregator persona — deferred to v1.1 multi-tenant release.
  // Kept as a typed role so legacy data doesn't break; capabilities fall back
  // to a minimal Today-only view if anyone is assigned this role today.
  aggregator: {
    routes: new Set(['/']),
    showsCampaigns: false,
    showsAllLeads: false,
    showsInventoryEdit: false,
    showsApprovals: false,
    showsAnalytics: false,
  },
  admin: {
    routes: new Set(['/', '/leads', '/visits', '/approvals', '/properties', '/analytics', '/agents', '/campaigns']),
    showsCampaigns: true,
    showsAllLeads: true,
    showsInventoryEdit: true,
    showsApprovals: true,
    showsAnalytics: true,
  },
};

// Hook: returns current role (defaults to sales_head when profile hasn't loaded yet
// so the dashboard never flashes a restricted view at users who actually have access).
export function useRole(): Role {
  const { profile } = useAuth();
  return profile?.role ?? 'sales_head';
}

// Hook: returns capability flags for the current role.
export function useCapabilities() {
  const role = useRole();
  return ROLE_CAPABILITIES[role];
}

// Display-ready role labels for the UI
export const ROLE_LABELS: Record<Role, { full: string; short: string; eyebrow: string }> = {
  sales_head: { full: 'Sales Head',    short: 'Head',      eyebrow: 'Floor' },
  sales_rep:  { full: 'Sales Rep',     short: 'Rep',       eyebrow: 'My desk' },
  marketing:  { full: 'Marketing Lead', short: 'Marketing', eyebrow: 'Campaigns' },
  aggregator: { full: 'Partner (v2)',  short: 'Partner',   eyebrow: 'Referrals' },
  admin:      { full: 'Admin',         short: 'Admin',     eyebrow: 'Admin' },
};

// Render-gate. Wraps protected routes; redirects unauthenticated users to /login.
// While loading, renders a minimal splash so the page doesn't flash empty content.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-muted-foreground text-sm">
          <div className="animate-pulse">Loading…</div>
        </div>
      </div>
    );
  }

  if (!session) {
    // Preserve original pathname (search params are an object in TanStack Router, so we skip them).
    const next = location.pathname && location.pathname !== '/' ? encodeURIComponent(location.pathname) : undefined;
    return <Navigate to="/login" search={next ? { next } : undefined} replace />;
  }

  return <>{children}</>;
}
