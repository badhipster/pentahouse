export function agentBadgeClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('listing')) return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
  if (n.includes('ad agent') || n === 'ad') return 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30';
  if (n.includes('lead')) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (n.includes('nurture')) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
  if (n.includes('conversion')) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';
  if (n.includes('visit calendar') || n.includes('meta lead')) return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
  return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30';
}

export function stageColor(stage: string): string {
  const s = stage.toLowerCase();
  if (s === 'new') return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300';
  if (s === 'qualified') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (s === 'visit scheduled') return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
  if (s === 'visited') return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300';
  if (s === 'negotiation') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  if (s === 'booked') return 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300';
  if (s === 'lost') return 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
  return 'bg-zinc-500/15 text-zinc-700';
}

export const STAGES = ['New', 'Qualified', 'Visit Scheduled', 'Visited', 'Negotiation', 'Booked', 'Lost'] as const;
