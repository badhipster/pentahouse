import { agentBadgeClass } from '@/lib/agent-colors';
import { cn } from '@/lib/utils';

export function AgentBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
        agentBadgeClass(name),
        className
      )}
    >
      {name}
    </span>
  );
}
