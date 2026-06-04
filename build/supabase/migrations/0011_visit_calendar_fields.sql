-- ============================================================================
-- 0011_visit_calendar_fields.sql
-- ============================================================================
-- Adds calendar-tracking columns to visits so the new Visit Calendar workflow
-- (07_visit_calendar.json) can persist the Google Calendar event id + URL.
-- Both nullable + additive: visits created before this migration continue to
-- work; only newly-scheduled visits get calendar fields populated.
--
-- Why bother storing the Calendar event id:
--   * Lets the dashboard show "View in Calendar" links from the visit card
--   * Lets a future workflow update or cancel the event when the visit
--     status changes (e.g., buyer reschedules → patch the event start time)
--   * Audit trail when something goes wrong (event went out at the wrong time)
-- ============================================================================

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS calendar_event_id  TEXT,
  ADD COLUMN IF NOT EXISTS calendar_event_url TEXT,
  ADD COLUMN IF NOT EXISTS calendar_provider  TEXT DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS attendee_email     TEXT;

-- Partial index — only on visits that actually have a calendar id, so we
-- don't bloat the table with NULL entries
CREATE INDEX IF NOT EXISTS visits_calendar_event_idx
  ON visits(calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;

COMMENT ON COLUMN visits.calendar_event_id  IS 'Google Calendar event id, populated by 07_visit_calendar.json when a visit is scheduled.';
COMMENT ON COLUMN visits.calendar_event_url IS 'Direct URL to the calendar event (htmlLink from Calendar API). Surfaced in dashboard.';
COMMENT ON COLUMN visits.calendar_provider  IS '"google" today; future: "calendly", "ms365", etc.';
COMMENT ON COLUMN visits.attendee_email     IS 'Buyer email if captured at intake. Used as Calendar invite recipient.';
