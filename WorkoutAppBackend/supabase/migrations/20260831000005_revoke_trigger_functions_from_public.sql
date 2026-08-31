-- The revoke in 20260831000004 targeted anon/authenticated, but Postgres grants
-- EXECUTE to PUBLIC by default and those roles inherit it there, so the advisor
-- still saw the trigger functions on the REST surface. Revoke from PUBLIC.
revoke execute on function public.refresh_nutrition_day_totals() from public;
revoke execute on function public.refresh_thread_preview()       from public;
revoke execute on function public.set_updated_at()               from public;
