import { useEffect, useState, useRef } from 'react';
import { Bell, Search, Moon, Sun, LogOut, User as UserIcon, Mail, ChevronDown } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import { fixtures } from '@/lib/fixtures';
import { CommandPalette } from './CommandPalette';
import { useAuth, ROLE_LABELS } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Color tokens per role for the topbar badge — keeps personas visually distinct
const ROLE_BADGE_CLS: Record<string, string> = {
  sales_head: 'bg-primary/10 text-primary border-primary/30',
  sales_rep:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  marketing:  'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  admin:      'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
  aggregator: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
};

export function Topbar() {
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);
  const acks = useAppStore((s) => s.ackEscalations);
  const openEscalations = fixtures.escalations.filter(
    (e: any) => (e.status === 'open' || e.status === 'acknowledged') && !acks.includes(e.id)
  ).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  const toggleDark = () => document.documentElement.classList.toggle('dark');

  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <header className="h-14 shrink-0 border-b bg-background/85 backdrop-blur sticky top-0 z-30 px-5 flex items-center gap-4">
      {/* Date — like a newspaper masthead */}
      <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="eyebrow">Vol. 1</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="tabular-nums">{today}</span>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex-1 max-w-md flex items-center gap-2 px-3 h-9 rounded-md border bg-muted/40 text-muted-foreground text-[13px] hover:bg-muted transition-colors"
      >
        <Search className="size-4" />
        <span>Search leads, projects…</span>
        <kbd className="ml-auto text-[10px] bg-background border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
      </button>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" onClick={toggleDark} title="Toggle theme">
        <Sun className="size-4 dark:hidden" />
        <Moon className="size-4 hidden dark:inline" />
      </Button>
      <div className="relative">
        <Button variant="ghost" size="icon">
          <Bell className="size-4" />
        </Button>
        {openEscalations > 0 && (
          <span className="absolute top-1 right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center tabular-nums font-medium">
            {openEscalations}
          </span>
        )}
      </div>
      <UserMenu />
      <CommandPalette />
    </header>
  );
}

function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Signed in';
  const email = profile?.email || user?.email || '';
  const role = profile?.role || 'sales_head';
  const roleLabel = ROLE_LABELS[role];
  const initials = (displayName || 'U').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const badgeCls = ROLE_BADGE_CLS[role] || ROLE_BADGE_CLS.sales_head;

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    toast.success('Signed out');
    navigate({ to: '/login', replace: true });
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full hover:bg-muted/60 pl-1 pr-2.5 py-1 transition-colors"
        aria-label="User menu"
      >
        <span className="size-9 rounded-full bg-primary/15 text-primary grid place-items-center text-sm font-semibold tabular-nums">
          {initials}
        </span>
        <span className={cn('hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-medium', badgeCls)}>
          {roleLabel.short}
        </span>
        <ChevronDown className={cn('size-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-md border bg-popover shadow-lg z-50 py-1 text-sm">
          <div className="px-3 py-2.5 border-b">
            <div className="font-semibold leading-tight truncate">{displayName}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <Mail className="size-3 shrink-0" /> <span className="truncate">{email}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1.5 flex items-center gap-1">
              <UserIcon className="size-2.5" /> Role: {role.replace('_', ' ')}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted/60 text-rose-700 dark:text-rose-300"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
