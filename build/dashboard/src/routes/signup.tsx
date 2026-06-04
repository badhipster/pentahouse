import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export const Route = createFileRoute('/signup')({
  head: () => ({
    meta: [
      { title: 'Create account — Pentahouse' },
      { name: 'description', content: 'Create your Pentahouse sales OS account.' },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { session, loading, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to home.
  useEffect(() => {
    if (!loading && session) {
      navigate({ to: '/', replace: true });
    }
  }, [loading, session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    const result = await signUp(email.trim(), password, displayName.trim() || email.split('@')[0]);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Sign-up failed');
      return;
    }
    toast.success('Account created. Check your email if confirmation is required.');
    // Supabase may send a confirmation email depending on project settings.
    // If email confirm is off, the user is already signed in; auth listener picks it up.
    navigate({ to: '/', replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 paper-grain">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl tracking-tight">Pentahouse</h1>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-2">Sales OS</p>
        </div>

        <Card className="p-7 shadow-sm">
          <div className="eyebrow">Create account</div>
          <h2 className="font-display text-2xl mt-0.5 mb-5">Take control of your floor.</h2>

          <form onSubmit={onSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="display_name" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Your name
              </label>
              <input
                id="display_name"
                type="text"
                required
                autoComplete="name"
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Priya Sharma"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
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
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded p-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </Card>

        <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center mt-6">
          You'll be set as a <span className="font-medium">sales head</span> by default.
        </p>
      </div>
    </div>
  );
}
