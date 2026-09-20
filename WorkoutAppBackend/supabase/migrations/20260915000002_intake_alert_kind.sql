-- Raised by complete_intake (20260915000005) so the coach knows a new client
-- finished setup and is still on starter macros.
--
-- Its own migration: a value added with ADD VALUE cannot be used inside the
-- transaction that adds it.
alter type public.alert_kind add value if not exists 'intake-complete';
