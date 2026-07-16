-- ============================================================================
-- Daily Tracker — add the "hold" (On hold) value to the entry_status enum.
-- Run this on databases created before this value existed (i.e. any project
-- set up from the original 0001 migration). Idempotent and safe to re-run.
-- ============================================================================

alter type entry_status add value if not exists 'hold';
