import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Editorial KPI card — eyebrow label, Fraunces display numeral, plain-English subtitle.
 * Numbers want to look like facts in a newspaper, not buttons in a dashboard.
 */
export function KpiCard({
  label,
  value,
  subtitle,
  trend,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: ReactNode;
  subtitle?: ReactNode;
  trend?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative p-5 bg-card border overflow-hidden',
        onClick && 'cursor-pointer action-card'
      )}
    >
      {/* Tonal accent rail — earns its color only when something is hot or won */}
      {tone !== 'default' && (
        <span
          aria-hidden
          className={cn(
            'absolute left-0 top-3 bottom-3 w-[3px] rounded-r-sm',
            tone === 'success' && 'bg-success',
            tone === 'warning' && 'bg-warning',
            tone === 'danger' && 'bg-destructive'
          )}
        />
      )}

      <div className="eyebrow">{label}</div>

      <div className="mt-2 flex items-baseline gap-2">
        <div
          className={cn(
            'font-display text-[40px] leading-none tabular-nums',
            tone === 'success' && 'text-success',
            tone === 'warning' && 'text-warning',
            tone === 'danger' && 'text-destructive'
          )}
          style={{ fontVariationSettings: '"SOFT" 30, "WONK" 0' }}
        >
          {value}
        </div>
        {trend && <div className="text-sm">{trend}</div>}
      </div>

      {subtitle && (
        <div className="mt-2.5 text-[12.5px] leading-snug text-muted-foreground max-w-[28ch]">
          {subtitle}
        </div>
      )}
    </Card>
  );
}
