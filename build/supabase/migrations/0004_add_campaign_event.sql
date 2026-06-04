-- ============================================================================
-- Migration 0004: Add CAMPAIGN_LIVE to the agent_events event_name CHECK
-- ============================================================================
-- The Ad Agent emits a CAMPAIGN_LIVE event when it drafts 3 platform campaigns
-- for a property. The original schema CHECK locked event_name to 9 names; we
-- now allow CAMPAIGN_LIVE too.
-- ============================================================================

ALTER TABLE agent_events
  DROP CONSTRAINT IF EXISTS agent_events_event_name_check;

ALTER TABLE agent_events
  ADD CONSTRAINT agent_events_event_name_check
  CHECK (event_name IN (
    'LISTING_SYNCED',
    'LEAD_RECEIVED',
    'LEAD_SCORED',
    'MESSAGE_SENT',
    'VISIT_SCHEDULED',
    'VISIT_COMPLETED',
    'VISIT_NO_SHOW',
    'BOOKING_MADE',
    'ESCALATION_TRIGGERED',
    'CAMPAIGN_LIVE'
  ));

-- Quick verify: this should return one row showing the updated definition
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'agent_events_event_name_check';
