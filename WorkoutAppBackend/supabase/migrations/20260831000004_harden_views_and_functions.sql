-- Advisor fixes (supabase get_advisors, security).
--
-- 1. Views default to the definer's permissions in Postgres 15+, which would
--    let a caller read through v_trainer_profiles / v_trainer_summary past the
--    RLS on the underlying tables. security_invoker makes them obey the
--    caller's policies instead -- which is the whole point of the RLS work.
alter view public.v_trainer_profiles set (security_invoker = on);
alter view public.v_trainer_summary  set (security_invoker = on);

-- 2. The two denormalisation functions must be SECURITY DEFINER to write past
--    RLS from inside a trigger, but they are trigger functions and have no
--    business being callable as RPC. Take them off the exposed API surface.
revoke execute on function public.refresh_nutrition_day_totals() from anon, authenticated;
revoke execute on function public.refresh_thread_preview()       from anon, authenticated;
revoke execute on function public.set_updated_at()               from anon, authenticated;
