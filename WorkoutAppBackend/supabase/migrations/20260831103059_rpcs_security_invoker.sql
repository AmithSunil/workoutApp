-- The write RPCs were SECURITY DEFINER, which was wrong.
--
-- A SECURITY DEFINER function runs as its owner and therefore bypasses RLS
-- entirely. That is invisible today because the dev policies are open, but it
-- would have been a live hole the moment real policies land: create_workout_log
-- would happily write a log for a client the caller has no business touching,
-- and the auth migration would have looked correct while doing nothing.
--
-- These functions do not need elevation. Every table they touch is one the
-- caller is expected to be able to write under RLS; the only genuinely
-- privileged operation is minting an id, and next_id stays DEFINER for that
-- (id_sequences has RLS on and no policies, so it is unreachable any other way).
-- As SECURITY INVOKER the RPCs simply obey whatever policies are in force,
-- which is what makes the pending auth migration a policy swap and nothing more.

alter function public.create_routine(jsonb)                       security invoker;
alter function public.update_routine(text, jsonb)                 security invoker;
alter function public.assign_routine(text, text[])                security invoker;
alter function public.duplicate_routine(text)                     security invoker;
alter function public.create_assignment(text, text)               security invoker;
alter function public.customise_assignment(text, jsonb)           security invoker;
alter function public.reset_assignment(text)                      security invoker;
alter function public.create_workout_session(jsonb)               security invoker;
alter function public.create_workout_log(jsonb)                   security invoker;
alter function public.get_or_create_nutrition_day(text, date)     security invoker;
alter function public.add_food_entries(jsonb)                     security invoker;
alter function public.delete_food_entry(text)                     security invoker;
alter function public.toggle_habit(text, date)                    security invoker;
alter function public.mark_thread_read(text, text)                security invoker;
alter function public.write_routine_days(text, jsonb, boolean)    security invoker;

-- Supabase's default privileges grant EXECUTE on new functions to anon and
-- authenticated directly, not via PUBLIC, so revoking from PUBLIC alone leaves
-- them on the REST surface. Name the roles.
revoke execute on function public.write_routine_days(text, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.assert_client(text)                      from public, anon, authenticated;
revoke execute on function public.bump_thread_unread()                     from public, anon, authenticated;
revoke execute on function public.refresh_nutrition_day_totals()           from public, anon, authenticated;
revoke execute on function public.refresh_thread_preview()                 from public, anon, authenticated;
revoke execute on function public.set_updated_at()                         from public, anon, authenticated;
