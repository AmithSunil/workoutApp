-- Removes the waist measurement, for the same reason body fat went one
-- migration earlier: nothing in the app ever wrote or displayed it, so the
-- column held fixture numbers and nothing else. `body_metrics` is now a
-- weigh-in log: who, when, how heavy.
--
-- DESTRUCTIVE: stored waist_cm values are deleted.

alter table public.body_metrics drop column waist_cm;
