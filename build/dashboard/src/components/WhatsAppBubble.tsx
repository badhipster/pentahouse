import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { shortTime } from '@/lib/format';

export function WhatsAppBubble({
  content,
  direction,
  time,
  status,
  language,
  className,
}: {
  content: string;
  direction: 'inbound' | 'outbound';
  time?: string;
  status?: string;
  language?: 'en' | 'hi';
  className?: string;
}) {
  const isOut = direction === 'outbound';
  return (
    <div
      className={cn(
        'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm relative',
        isOut
          ? 'bg-emerald-500/10 text-foreground ml-auto rounded-br-sm border border-emerald-500/20'
          : 'bg-zinc-200 dark:bg-zinc-700 text-foreground mr-auto rounded-bl-sm',
        language === 'hi' && 'font-[Noto_Sans_Devanagari,Inter,sans-serif]',
        className
      )}
    >
      <div className="whitespace-pre-wrap leading-snug">{content}</div>
      {(time || status) && (
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          {time && <span className="tabular-nums">{shortTime(time)}</span>}
          {isOut && status === 'sent' && <Check className="size-3" />}
          {isOut && status === 'delivered' && <CheckCheck className="size-3 text-blue-500" />}
        </div>
      )}
    </div>
  );
}
