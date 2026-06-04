// Turn raw agent_logs / agent_events into plain-English news items
// a non-technical sales manager can scan in two seconds.

export type HumanLog = {
  headline: string;        // bold one-liner — lead name first when possible
  detail?: string;         // optional secondary line
  actionLabel?: string;    // "Review", "Open lead", "Send WhatsApp" — appears as a chip CTA
  actionTo?: '/approvals' | '/visits' | '/leads' | '/' | null;
  actionLeadId?: string | null;  // when present + actionTo === '/leads', deep-links to the lead detail
  tone: 'calm' | 'warm' | 'hot' | 'win';
  agentName: string;
  createdAt: string;
  durationMs?: number | null;
  leadName?: string | null;
  leadId?: string | null;
};

function parseScored(output: string) {
  const fit = output.match(/fit\s*=\s*(\d+)/i)?.[1];
  const urg = output.match(/urgency\s*=\s*(\d+)/i)?.[1];
  const action = output.match(/action\s*=\s*([^,;]+?)\s*$/i)?.[1]?.trim();
  return { fit, urg, action };
}

function parseObjections(output: string) {
  const objMatch = output.match(/objections\s*=\s*\[([^\]]*)\]/i);
  const sentMatch = output.match(/sentiment\s*=\s*([a-z]+)/i);
  const raw = (objMatch?.[1] ?? '').replace(/["']/g, '').trim();
  const objections = raw ? raw.split(/\s*,\s*/).filter(Boolean) : [];
  return { objections, sentiment: sentMatch?.[1]?.toLowerCase() };
}

export function humanize(log: any): HumanLog {
  const leadName: string | null = log.lead_name ?? null;
  const leadLabel = leadName ?? 'A new lead';
  const action: string = log.action ?? '';
  const output: string = log.output_summary ?? '';
  const agent: string = log.agent_name ?? 'AI';
  const created = log.created_at;
  const duration = log.duration_ms;
  const leadId = log.lead_id ?? null;
  const base = { agentName: agent, createdAt: created, durationMs: duration, leadName, leadId };

  // Lead Agent
  if (action === 'scored_lead') {
    const { action: rec, urg } = parseScored(output);
    const heat = parseInt(urg ?? '0', 10);
    const tone: HumanLog['tone'] = heat >= 80 ? 'hot' : heat >= 50 ? 'warm' : 'calm';
    return {
      ...base,
      headline: `${leadLabel} just scored. Next step: ${rec ?? 'review'}.`,
      actionLabel: 'Open lead',
      actionTo: '/leads',
      actionLeadId: leadId,
      tone,
    };
  }
  if (action === 'escalated') {
    return {
      ...base,
      headline: `${leadLabel} needs your direct call.`,
      detail: output,
      actionLabel: 'Open lead',
      actionTo: '/leads',
      actionLeadId: leadId,
      tone: 'hot',
    };
  }

  // Nurture Agent
  if (action === 'drafted_message') {
    const lang = /HI$/i.test(output) ? 'Hindi' : 'English';
    return {
      ...base,
      headline: `New WhatsApp draft for ${leadLabel}.`,
      detail: `${lang} message, waiting for your approval.`,
      actionLabel: 'Review and send',
      actionTo: '/approvals',
      tone: 'warm',
    };
  }
  if (action === 'message_sent') {
    return {
      ...base,
      headline: `WhatsApp sent to ${leadLabel}.`,
      tone: 'calm',
    };
  }
  if (action === 'message_rejected') {
    return {
      ...base,
      headline: `Skipped a draft for ${leadLabel}.`,
      detail: output,
      tone: 'calm',
    };
  }

  // Conversion Agent
  if (action === 'extracted_objections') {
    const { objections, sentiment } = parseObjections(output);
    const concerns =
      objections.length === 0
        ? null
        : objections.length === 1
        ? objections[0]
        : objections.length === 2
        ? `${objections[0]} and ${objections[1]}`
        : `${objections.slice(0, -1).join(', ')}, and ${objections.at(-1)}`;
    return {
      ...base,
      headline: concerns
        ? `${leadLabel} raised concerns: ${concerns}.`
        : `${leadLabel} visited the site.`,
      detail: sentiment ? `Mood after the visit: ${sentiment}.` : undefined,
      actionLabel: 'Open lead',
      actionTo: '/leads',
      actionLeadId: leadId,
      tone: objections.includes('price') || objections.includes('competitor') ? 'warm' : 'calm',
    };
  }
  if (action === 'booking_recorded') {
    return {
      ...base,
      headline: `🎉 ${leadLabel} just booked.`,
      detail: output,
      actionLabel: 'Open lead',
      actionTo: '/leads',
      actionLeadId: leadId,
      tone: 'win',
    };
  }
  if (action === 'visit_status_no_show') {
    return {
      ...base,
      headline: `${leadLabel} did not show up.`,
      detail: 'Time to re-engage. Their interest is not dead yet.',
      actionLabel: 'Open lead',
      actionTo: '/leads',
      actionLeadId: leadId,
      tone: 'warm',
    };
  }

  // Visit Calendar (07_visit_calendar.json) — booking API integration
  if (action === 'calendar_event_created') {
    const okMatch = output.toLowerCase().startsWith('calendar event');
    return {
      ...base,
      headline: okMatch
        ? `Visit on the calendar for ${leadLabel}.`
        : `Calendar sync failed for ${leadLabel}.`,
      detail: okMatch
        ? 'The rep and the buyer just got an invite. Reminders set 60 and 15 minutes before.'
        : output,
      actionLabel: 'Open lead',
      actionTo: '/leads',
      actionLeadId: leadId,
      tone: okMatch ? 'warm' : 'hot',
    };
  }

  // Ad / Listing
  if (action === 'simulated_campaign') {
    return {
      ...base,
      headline: 'New campaign live.',
      detail: output,
      tone: 'calm',
    };
  }
  if (action === 'listing_synced') {
    return {
      ...base,
      headline: 'A new project was added to the catalogue.',
      detail: output,
      tone: 'calm',
    };
  }

  // Fallback — still readable
  const pretty = action.replace(/_/g, ' ');
  return {
    ...base,
    headline: leadName ? `${leadName}: ${pretty}.` : `${agent} ${pretty}.`,
    detail: output || undefined,
    tone: 'calm',
  };
}

export const toneCls = (t: HumanLog['tone']) => {
  switch (t) {
    case 'hot':
      return 'border-l-4 border-l-rose-500';
    case 'warm':
      return 'border-l-4 border-l-amber-500';
    case 'win':
      return 'border-l-4 border-l-emerald-500';
    default:
      return 'border-l-4 border-l-slate-300 dark:border-l-slate-600';
  }
};

// Friendly date helpers
export function friendlyDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + (isoDate.length === 10 ? 'T00:00:00' : ''));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  if (diffDays < -1 && diffDays >= -7) return d.toLocaleDateString(undefined, { weekday: 'long' }) + ' last week';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function friendlyTime(time: string | null | undefined): string {
  if (!time) return '';
  // expects HH:MM (24h)
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return time;
  const h = parseInt(m[1], 10);
  const min = m[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${min} ${period}`;
}
