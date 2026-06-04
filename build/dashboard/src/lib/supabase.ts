import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Surfaced clearly in the console rather than a cryptic runtime crash.
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Create .env.local in the dashboard root with both values, then restart the dev server.'
  );
}

export const supabase = createClient(url ?? 'http://localhost', anon ?? 'missing-anon-key', {
  auth: {
    // Persist the session in localStorage so a tab refresh doesn't log the user out.
    persistSession: true,
    // Refresh tokens silently in the background before they expire.
    autoRefreshToken: true,
    // Reflect external sign-in/out across tabs.
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
