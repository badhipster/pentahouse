import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Sign in — Pentahouse' },
      { name: 'description', content: 'Sign in to your Pentahouse sales OS account.' },
    ],
  }),
  validateSearch: (search): { next?: string } => ({
    next: typeof search.next === 'string' ? search.next : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const { next } = useSearch({ from: '/login' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to the intended destination.
  useEffect(() => {
    if (!loading && session) {
      navigate({ to: (next ? decodeURIComponent(next) : '/') as any, replace: true });
    }
  }, [loading, session, next, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed');
      return;
    }
    toast.success('Signed in');
    navigate({ to: (next ? decodeURIComponent(next) : '/') as any, replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 paper-grain">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-tight">Pentahouse</h1>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-2">Sales OS</p>
        </div>

        <Card className="p-7 shadow-sm">
          <div className="eyebrow">Sign in</div>
          <h2 className="font-display text-2xl mt-0.5 mb-5">Welcome back.</h2>

          <form onSubmit={onSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-md border bg-background text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="you@developer.in"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded p-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            New to Pentahouse?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </Card>

        <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center mt-6">
          For mid-tier Indian residential developers · Single-tenant pilot
        </p>
      </div>
    </div>
  );
}
