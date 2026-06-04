// Data layer wired to Supabase.
// Every component still calls the same exported function names with the same
// shapes. Only this file changes between fixtures and live data.
// If you ever need to fall back to fixtures, swap the import in components
// (they all import from this file).

import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// n8n webhook endpoints (optional). When configured, mutations call n8n first
// (which performs the side effects like Twilio sends). On any failure, we
// fall back to a direct Supabase update so the UI is never blocked.
// ---------------------------------------------------------------------------
const N8N_APPROVE = import.meta.env.VITE_N8N_APPROVAL_ENDPOINT as string | undefined;
const N8N_VISIT = import.meta.env.VITE_N8N_VISIT_ENDPOINT as string | undefined;
const N8N_TOKEN = import.meta.env.VITE_N8N_APPROVAL_TOKEN as string | undefined;
const N8N_LISTING = import.meta.env.VITE_N8N_LISTING_ENDPOINT as string | undefined;
const N8N_ADS = import.meta.env.VITE_N8N_ADS_ENDPOINT as string | undefined;

async function postToN8n(endpoint: string | undefined, body: unknown): Promise<Response> {
  if (!endpoint) throw new Error('n8n endpoint not configured');
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(N8N_TOKEN ? { 'X-Approval-Token': N8N_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// READS
// ---------------------------------------------------------------------------

export async function getLeadQueue() {
  const { data, error } = await supabase
    .from('v_lead_queue')
    .select('*')
    .order('overall_score', { ascending: false, nullsFirst: false });
  if (error) console.error('[data.getLeadQueue]', error);
  return data ?? [];
}

export async function getLead(id: string) {
  const { data, error } = await supabase
    .from('v_lead_queue')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle();
  if (error) console.error('[data.getLead]', error);
  return data ?? undefined;
}

export async function getMessages(leadId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(
      'message_id:id, lead_id, direction, content, language, status, created_at, sent_at, rejection_reason'
    )
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) console.error('[data.getMessages]', error);
  return data ?? [];
}

export async function getPendingApprovals() {
  // Fetch pending messages and enrich with lead + score info so the queue card
  // can render name, source, project, overall_score without extra fetches.
  const [{ data: msgs, error: msgErr }, queue] = await Promise.all([
    supabase
      .from('messages')
      .select(
        'message_id:id, lead_id, direction, content, language, status, created_at, sent_at, rejection_reason'
      )
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false }),
    getLeadQueue(),
  ]);
  if (msgErr) console.error('[data.getPendingApprovals]', msgErr);
  const byLead = new Map<string, any>();
  queue.forEach((l: any) => byLead.set(l.lead_id, l));
  return (msgs ?? []).map((m: any) => {
    const lead = byLead.get(m.lead_id);
    return {
      ...m,
      lead_name: lead?.name ?? null,
      source: lead?.source ?? null,
      stage: lead?.stage ?? null,
      overall_score: lead?.overall_score ?? null,
      matched_project: lead?.matched_project ?? null,
    };
  });
}

export async function getVisits(leadId?: string) {
  let q = supabase.from('visits').select('*');
  if (leadId) q = q.eq('lead_id', leadId);
  const { data, error } = await q.order('scheduled_date', { ascending: false });
  if (error) console.error('[data.getVisits]', error);
  return data ?? [];
}

export async function getEscalations() {
  const { data, error } = await supabase
    .from('escalations')
    .select(
      'id, lead_id, reason_code, reason_text, recommended_action, status, created_at, leads(name)'
    )
    .in('status', ['open', 'acknowledged'])
    .order('created_at', { ascending: false });
  if (error) console.error('[data.getEscalations]', error);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    lead_id: r.lead_id,
    lead_name: r.leads?.name ?? 'Lead',
    reason_code: r.reason_code,
    reason_text: r.reason_text,
    recommended_action: r.recommended_action,
    status: r.status,
    created_at: r.created_at,
  }));
}

// Per-source funnel for the Marketing persona /today view.
// Returns one row per source (Meta Ad, Google Ad, 99acres, etc.) with leads,
// qualified, visits, bookings, spend, and three cost-per-* derivatives.
export async function getSourceFunnel() {
  const { data, error } = await supabase
    .from('v_source_roi')
    .select('*')
    .order('leads_count', { ascending: false });
  if (error) console.error('[data.getSourceFunnel]', error);
  return data ?? [];
}

// Aggregated agent observatory data — rolls up agent_logs into per-agent stats.
// Returns one row per agent with: total runs (24h), success rate, p50 latency,
// last run timestamp, and the 5 most recent rows for the activity feed.
export async function getAgentObservatory() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from('agent_logs')
    .select('agent_name, action, status, duration_ms, output_summary, lead_id, created_at, leads(name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) console.error('[data.getAgentObservatory]', error);

  const agents = ['Listing Agent','Ad Agent','Lead Agent','Nurture Agent','Conversion Agent'];
  const byAgent: Record<string, any[]> = Object.fromEntries(agents.map(a => [a, []]));
  (rows ?? []).forEach((r: any) => {
    if (byAgent[r.agent_name]) byAgent[r.agent_name].push(r);
  });

  return agents.map(name => {
    const items = byAgent[name];
    const total = items.length;
    const ok = items.filter(i => i.status === 'ok').length;
    const errors = items.filter(i => i.status === 'error').length;
    const durations = items.map(i => i.duration_ms).filter(Boolean).sort((a, b) => a - b);
    const p50 = durations.length ? durations[Math.floor(durations.length / 2)] : null;
    const lastRun = items[0]?.created_at ?? null;
    const recent = items.slice(0, 5).map(i => ({
      action: i.action,
      output_summary: i.output_summary,
      status: i.status,
      lead_name: i.leads?.name ?? null,
      created_at: i.created_at,
    }));
    return {
      name,
      total_24h: total,
      success_pct: total ? Math.round((ok / total) * 100) : null,
      error_count: errors,
      p50_ms: p50,
      last_run: lastRun,
      recent,
      health: total === 0 ? 'idle' : errors / Math.max(1, total) > 0.2 ? 'degraded' : 'healthy',
    };
  });
}

// Per-lead journey: every event tied to this lead across all 5 agents,
// chronological. Powers the timeline on the lead detail page.
export async function getLeadJourney(leadId: string) {
  const { data, error } = await supabase
    .from('agent_events')
    .select('event_name, source_agent, payload, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) console.error('[data.getLeadJourney]', error);
  return data ?? [];
}

export async function getAgentLogs(limit = 50) {
  const { data, error } = await supabase
    .from('agent_logs')
    .select(
      'agent_name, action, input_summary, output_summary, duration_ms, status, created_at, lead_id, leads(name)'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('[data.getAgentLogs]', error);
  return (data ?? []).map((r: any) => ({
    agent_name: r.agent_name,
    action: r.action,
    input_summary: r.input_summary,
    output_summary: r.output_summary,
    duration_ms: r.duration_ms,
    status: r.status,
    created_at: r.created_at,
    lead_id: r.lead_id,
    lead_name: r.leads?.name ?? null,
  }));
}

export async function getAgentEvents() {
  // Funnel chart expects [{ event_name, count }]. We count in JS.
  const { data, error } = await supabase.from('agent_events').select('event_name');
  if (error) console.error('[data.getAgentEvents]', error);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    counts[r.event_name] = (counts[r.event_name] ?? 0) + 1;
  });
  return Object.entries(counts).map(([event_name, count]) => ({ event_name, count }));
}

export async function getKPIs() {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYest = new Date(startToday);
  startYest.setDate(startYest.getDate() - 1);
  const start30 = new Date(startToday);
  start30.setDate(start30.getDate() - 30);

  const [leadsRes, pendingRes, bookingsRes, visitsRes] = await Promise.all([
    supabase.from('leads').select('id, created_at, intent_fields_count'),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_approval'),
    supabase
      .from('bookings')
      .select('id, booking_amount, created_at', { count: 'exact' }),
    supabase
      .from('visits')
      .select('id, status', { count: 'exact' })
      .eq('status', 'Completed'),
  ]);

  const leadsArr = leadsRes.data ?? [];
  const bookingsArr = bookingsRes.data ?? [];
  const bookings_30d = bookingsArr.filter(
    (b: any) => new Date(b.created_at) >= start30
  ).length;
  const leads_today = leadsArr.filter((l: any) => new Date(l.created_at) >= startToday).length;
  const leads_yesterday = leadsArr.filter((l: any) => {
    const d = new Date(l.created_at);
    return d >= startYest && d < startToday;
  }).length;
  const qualified_30d = leadsArr.filter(
    (l: any) => (l.intent_fields_count ?? 0) >= 3
  ).length;
  const weekly_conversion_pct = qualified_30d
    ? Math.round(((bookings_30d / qualified_30d) * 1000)) / 10
    : 0;

  return {
    leads_today,
    leads_yesterday,
    pending_approvals: pendingRes.count ?? 0,
    weekly_conversion_pct,
    leads_30d: leadsArr.length,
    qualified_30d,
    visits_completed_30d: visitsRes.count ?? 0,
    bookings_30d,
    total_spend_30d_inr: 0,
    blended_cpb_inr: 0,
  };
}

export async function getPrimaryMetric() {
  // v1.1 P0-3: de-hardcoded. Read from v_speed_to_lead which is computed
  // from real first_response_at - created_at deltas over the last 24h. If no
  // measured runs exist yet, return null so the UI shows an honest empty state
  // instead of fabricating a 47s figure.
  const { data, error } = await supabase
    .from('v_speed_to_lead')
    .select('median_seconds, p90_seconds, under_5_min, under_1_hour, leads_with_response')
    .maybeSingle();
  if (error) console.error('[data.getPrimaryMetric]', error);
  const median = data?.median_seconds ?? null;
  return {
    median_sec_to_first_response_today: median,
    p90_sec_to_first_response_today: data?.p90_seconds ?? null,
    under_5_min: data?.under_5_min ?? 0,
    under_1_hour: data?.under_1_hour ?? 0,
    leads_with_response: data?.leads_with_response ?? 0,
    industry_baseline_sec: 18000,
    measured: median !== null,
  };
}

export async function getSourceROI() {
  const { data, error } = await supabase
    .from('v_source_roi')
    .select('*')
    .order('cost_per_booking', { ascending: true, nullsFirst: false });
  if (error) console.error('[data.getSourceROI]', error);
  return (data ?? []).map((r: any) => ({
    source: r.source,
    leads: r.leads_count,
    qualified: r.qualified_count,
    visits_completed: r.visits_completed,
    bookings: r.bookings_count,
    total_spend_inr: Number(r.total_spend_inr ?? 0),
    cost_per_lead: r.cost_per_lead,
    cost_per_visit: r.cost_per_visit,
    cost_per_booking: r.cost_per_booking,
  }));
}

export async function getProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'Active');
  if (error) console.error('[data.getProperties]', error);
  return data ?? [];
}

export async function getProperty(id: string | null | undefined) {
  if (!id) return undefined;
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) console.error('[data.getProperty]', error);
  return data ?? undefined;
}

export async function getEvalAccuracy() {
  // Story 8 / PRD §6: % of eval leads whose latest recommended_action matches expected_action.
  const { data: gt } = await supabase
    .from('eval_ground_truth')
    .select('lead_id, expected_action');
  const groundTruth = gt ?? [];
  if (!groundTruth.length) return { percent: 0, matches: 0, total: 0 };

  const leadIds = groundTruth.map((g: any) => g.lead_id);
  const { data: scores } = await supabase
    .from('lead_scores')
    .select('lead_id, recommended_action, scored_at')
    .in('lead_id', leadIds)
    .order('scored_at', { ascending: false });
  const latest: Record<string, string> = {};
  (scores ?? []).forEach((s: any) => {
    if (!(s.lead_id in latest)) latest[s.lead_id] = s.recommended_action;
  });
  let matches = 0;
  groundTruth.forEach((g: any) => {
    if (latest[g.lead_id] && latest[g.lead_id] === g.expected_action) matches++;
  });
  const total = groundTruth.length;
  return { percent: Math.round((matches / total) * 100), matches, total };
}

// ---------------------------------------------------------------------------
// MUTATIONS
// Each mutation tries the n8n webhook first (so Twilio etc fire) and falls
// back to a direct Supabase update if n8n is unreachable. The UI gets a
// resolved promise either way.
// ---------------------------------------------------------------------------

// v1.1 P0-3: capture the real approver from the current auth session so the
// audit trail is true. Falls back to 'system' only if no session (very unlikely
// since /approvals is auth-gated).
async function currentApproverIdentity(): Promise<{ approved_by: string; approver_user_id: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return {
      approved_by: session.user.email ?? session.user.id,
      approver_user_id: session.user.id,
    };
  }
  return { approved_by: 'system', approver_user_id: null };
}

export async function approveMessage(id: string) {
  const identity = await currentApproverIdentity();
  try {
    const res = await postToN8n(N8N_APPROVE, { message_id: id, action: 'approve', ...identity });
    if (res.ok) return { message_id: id, status: 'sent' };
    throw new Error('n8n ' + res.status);
  } catch (e) {
    console.warn('[data.approveMessage] n8n failed, falling back to Supabase update', e);
    await supabase
      .from('messages')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id);
    return { message_id: id, status: 'sent' };
  }
}

export async function rejectMessage(id: string, reason: string) {
  const identity = await currentApproverIdentity();
  try {
    const res = await postToN8n(N8N_APPROVE, { message_id: id, action: 'reject', reason, ...identity });
    if (res.ok) return { message_id: id, status: 'rejected' };
    throw new Error('n8n ' + res.status);
  } catch (e) {
    console.warn('[data.rejectMessage] n8n failed, falling back to Supabase update', e);
    await supabase
      .from('messages')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', id);
    return { message_id: id, status: 'rejected' };
  }
}

export async function editAndApproveMessage(id: string, newContent: string) {
  const identity = await currentApproverIdentity();
  try {
    const res = await postToN8n(N8N_APPROVE, {
      message_id: id,
      action: 'edit_approve',
      new_content: newContent,
      ...identity,
    });
    if (res.ok) return { message_id: id, status: 'sent' };
    throw new Error('n8n ' + res.status);
  } catch (e) {
    console.warn('[data.editAndApproveMessage] n8n failed, falling back to Supabase update', e);
    await supabase
      .from('messages')
      .update({ content: newContent, status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id);
    return { message_id: id, status: 'sent' };
  }
}

// Schedule a new site visit + fire the Visit Calendar webhook so a Google
// Calendar event with Meet link + .ics invite is actually created.
// Returns the calendar_event_url for the success toast deep-link.
export async function scheduleVisit(input: {
  lead_id: string;
  property_id: string;
  scheduled_date: string;   // YYYY-MM-DD
  scheduled_time: string;    // HH:MM 24h
  attendees: string;
  notes?: string;
}): Promise<{ ok: boolean; visit_id?: string; calendar_event_url?: string; error?: string }> {
  // Step 1: insert visit row in Supabase (DB is source of truth)
  const scheduled_at = `${input.scheduled_date}T${input.scheduled_time}:00`;
  const { data: row, error: insertErr } = await supabase
    .from('visits')
    .insert({
      lead_id: input.lead_id,
      property_id: input.property_id,
      scheduled_date: input.scheduled_date,
      scheduled_time: input.scheduled_time,
      scheduled_at,
      attendees: input.attendees,
      status: 'Scheduled',
      post_visit_notes: input.notes ?? null,
    })
    .select('id')
    .single();
  if (insertErr || !row) {
    console.error('[data.scheduleVisit] insert failed', insertErr);
    return { ok: false, error: insertErr?.message ?? 'Failed to create visit row' };
  }

  // Step 1b: flip the lead stage so downstream CTAs (Schedule -> Confirm) update.
  // Bug fix Jun 3: scheduling created the visit but never advanced the lead stage,
  // so the lead detail kept showing "Schedule site visit" as the primary CTA.
  await supabase
    .from('leads')
    .update({ stage: 'Visit Scheduled' })
    .eq('id', input.lead_id);

  // Step 2: fire the Visit Calendar webhook so n8n creates the Google Calendar event
  const N8N_CALENDAR = (import.meta.env.VITE_N8N_CALENDAR_ENDPOINT as string) || 'http://localhost:5678/webhook/schedule-visit';
  try {
    const res = await fetch(N8N_CALENDAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_id: row.id }),
    });
    if (!res.ok) {
      console.warn('[data.scheduleVisit] calendar webhook returned', res.status);
      return { ok: true, visit_id: row.id, error: `Calendar webhook ${res.status} — visit saved, calendar event missing` };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: true, visit_id: row.id, calendar_event_url: json.calendar_event_url ?? json.htmlLink };
  } catch (e: any) {
    console.warn('[data.scheduleVisit] calendar webhook unreachable', e);
    return { ok: true, visit_id: row.id, error: 'n8n unreachable — visit saved, calendar event missing' };
  }
}

export async function markVisitCompleted(id: string, notes: string) {
  try {
    const res = await postToN8n(N8N_VISIT, {
      visit_id: id,
      status: 'Completed',
      post_visit_notes: notes,
    });
    if (res.ok) return { id, status: 'Completed' };
    throw new Error('n8n ' + res.status);
  } catch (e) {
    console.warn('[data.markVisitCompleted] n8n failed, falling back to Supabase update', e);
    await supabase
      .from('visits')
      .update({
        status: 'Completed',
        post_visit_notes: notes,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);
    return { id, status: 'Completed' };
  }
}

export async function updateVisitStatus(id: string, status: string, notes: string) {
  try {
    const res = await postToN8n(N8N_VISIT, {
      visit_id: id,
      status,
      post_visit_notes: notes,
    });
    if (res.ok) return { id, status };
    throw new Error('n8n ' + res.status);
  } catch (e) {
    console.warn('[data.updateVisitStatus] n8n failed, falling back to Supabase update', e);
    const patch: Record<string, unknown> = { status };
    if (notes) patch.post_visit_notes = notes;
    await supabase.from('visits').update(patch).eq('id', id);
    return { id, status };
  }
}

export async function acknowledgeEscalation(id: string) {
  await supabase
    .from('escalations')
    .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('id', id);
  return { id, status: 'acknowledged' };
}

// ---------------------------------------------------------------------------
// Properties + campaigns + agent triggers (Listing Agent, Ad Agent)
// ---------------------------------------------------------------------------

export async function getCampaignsForProperty(propertyId: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) console.error('[data.getCampaignsForProperty]', error);
  return data ?? [];
}

/**
 * Calls Listing Agent. Returns the parsed response { ok, property_id?, error? }.
 * Does NOT have a Supabase fallback because property extraction requires Gemini.
 */
export async function syncListing(rawText: string): Promise<{ ok: boolean; property_id?: string; project_name?: string; error?: string }> {
  if (!N8N_LISTING) {
    return { ok: false, error: 'Listing Agent endpoint not configured. Set VITE_N8N_LISTING_ENDPOINT in .env.local.' };
  }
  try {
    const res = await fetch(N8N_LISTING, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: payload?.error || `Listing Agent responded ${res.status}` };
    }
    return { ok: true, property_id: payload.property_id, project_name: payload.project_name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Listing Agent unreachable' };
  }
}

/**
 * Calls Ad Agent for a property. Returns the generated copy + simulated metrics.
 */
export async function generateAds(propertyId: string): Promise<{ ok: boolean; platforms?: any; error?: string }> {
  if (!N8N_ADS) {
    return { ok: false, error: 'Ad Agent endpoint not configured. Set VITE_N8N_ADS_ENDPOINT in .env.local.' };
  }
  try {
    const res = await fetch(N8N_ADS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: payload?.error || `Ad Agent responded ${res.status}` };
    }
    return { ok: true, platforms: payload.platforms };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ad Agent unreachable' };
  }
}
