import { Link, useRouterState } from '@tanstack/react-router';
import { Home, Users, CheckCheck, Calendar, BarChart3, Building2, Megaphone, Cpu, FileSpreadsheet, ExternalLink } from 'lucide-react';

const SALES_OPS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Rix47Gr7idhmUFnapS4yD-I5IvQMTzyn2pHlBljF0Ow';
import { useRole, useCapabilities, ROLE_LABELS, type Role } from '@/lib/auth';

// Persona-specific section structure. Each persona gets a different sidebar.
// Single source of truth for what each role sees — keeps gating logic out of
// the component body.
const SECTIONS_BY_ROLE: Record<Role, ReadonlyArray<{
  eyebrow: string;
  items: ReadonlyArray<{ to: string; label: string; icon: any }>;
}>> = {
  sales_head: [
    { eyebrow: 'Desk', items: [
      { to: '/', label: 'Today', icon: Home },
    ]},
    { eyebrow: 'Floor pipeline', items: [
      { to: '/leads',     label: 'Leads',           icon: Users },
      { to: '/approvals', label: 'Messages to send', icon: CheckCheck },
      { to: '/visits',    label: 'Site visits',      icon: Calendar },
    ]},
    { eyebrow: 'Supply & spend', items: [
      { to: '/properties', label: 'Inventory', icon: Building2 },
      { to: '/campaigns',  label: 'Creative approvals', icon: Megaphone },
      { to: '/analytics',  label: 'Where wins come from', icon: BarChart3 },
    ]},
    { eyebrow: 'AI floor', items: [
      { to: '/agents', label: 'Agent observatory', icon: Cpu },
    ]},
  ],
  sales_rep: [
    { eyebrow: 'My desk', items: [
      { to: '/', label: 'Today', icon: Home },
    ]},
    { eyebrow: 'My pipeline', items: [
      { to: '/leads',     label: 'My deals',         icon: Users },
      { to: '/approvals', label: 'Messages to send',  icon: CheckCheck },
      { to: '/visits',    label: 'My site visits',    icon: Calendar },
    ]},
  ],
  marketing: [
    { eyebrow: 'Campaigns', items: [
      { to: '/', label: 'Today', icon: Home },
      { to: '/campaigns', label: 'Creative approvals', icon: Megaphone },
    ]},
    { eyebrow: 'Supply', items: [
      { to: '/properties', label: 'Inventory', icon: Building2 },
    ]},
    { eyebrow: 'Performance', items: [
      { to: '/analytics', label: 'Source funnel', icon: BarChart3 },
    ]},
    { eyebrow: 'AI floor', items: [
      { to: '/agents', label: 'Agent observatory', icon: Cpu },
    ]},
  ],
  // Aggregator persona — placeholder for v2 multi-tenant release.
  // v1 just shows Today so the role doesn't crash if accidentally assigned.
  aggregator: [
    { eyebrow: 'Desk', items: [
      { to: '/', label: 'Today', icon: Home },
    ]},
  ],
  admin: [
    { eyebrow: 'Desk', items: [
      { to: '/', label: 'Today', icon: Home },
    ]},
    { eyebrow: 'Pipeline', items: [
      { to: '/leads',     label: 'All leads',         icon: Users },
      { to: '/approvals', label: 'Messages to send',  icon: CheckCheck },
      { to: '/visits',    label: 'Site visits',       icon: Calendar },
    ]},
    { eyebrow: 'Supply & spend', items: [
      { to: '/properties', label: 'Inventory', icon: Building2 },
      { to: '/analytics',  label: 'Analytics', icon: BarChart3 },
    ]},
  ],
};

export function Sidebar() {
  const { location } = useRouterState();
  const role = useRole();
  const caps = useCapabilities();
  const sections = SECTIONS_BY_ROLE[role];
  const roleLabel = ROLE_LABELS[role];

  return (
    <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="px-6 pt-6 pb-5">
        <div className="font-display text-2xl leading-none tracking-tight">
          Pentahouse
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-px w-6 bg-primary" />
          <div className="eyebrow">{roleLabel.eyebrow}</div>
        </div>
      </div>
      <div className="rule mx-4" />

      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {sections.map((s) => (
          <div key={s.eyebrow}>
            <div className="px-3 pb-2 eyebrow">{s.eyebrow}</div>
            <div className="space-y-0.5">
              {s.items.map(({ to, label, icon: Icon }) => {
                // Defensive — never render a link to a route the role can't access
                if (!caps.routes.has(to)) return null;
                const active =
                  to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={
                      'group relative flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-md text-[13.5px] transition-colors ' +
                      (active
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60')
                    }
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm bg-primary"
                      />
                    )}
                    <Icon className={active ? 'size-4 text-primary' : 'size-4'} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="rule mx-4" />
      <div className="px-4 pt-3 pb-2">
        <a
          href={SALES_OPS_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-md border bg-emerald-500/5 hover:bg-emerald-500/10 text-[12px] text-emerald-700 dark:text-emerald-300 transition-colors group"
        >
          <FileSpreadsheet className="size-3.5 shrink-0" />
          <span className="flex-1 font-medium">Sales ops sheet</span>
          <ExternalLink className="size-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
      <div className="rule mx-4" />
      <div className="px-6 py-4 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          <span>Live · Supabase + n8n</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          Signed in as <span className="text-foreground font-medium">{roleLabel.full}</span>
        </div>
      </div>
    </aside>
  );
}
