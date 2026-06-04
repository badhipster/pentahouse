import { cn } from '@/lib/utils';

export function ScoreBar({
  label,
  value,
  tone = 'emerald',
}: {
  label: string;
  value: number;
  tone?: 'emerald' | 'indigo' | 'amber' | 'rose';
}) {
  const colorMap = {
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-12 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full', colorMap[tone])}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-7 text-right tabular-nums font-medium">{value}</span>
    </div>
  );
}
