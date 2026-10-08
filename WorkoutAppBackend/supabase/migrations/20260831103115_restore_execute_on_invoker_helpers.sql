-- Correction to the previous migration: write_routine_days and assert_client are
-- called from inside the RPCs, and now that those run SECURITY INVOKER the
-- nested call is checked against the *caller*, not the owner. Revoking EXECUTE
-- broke create_routine for anon. Both are SECURITY INVOKER themselves, so they
-- carry no privilege of their own and are safe to expose -- they write under
-- exactly the policies the caller already has.
grant execute on function public.write_routine_days(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.assert_client(text)                      to anon, authenticated;
