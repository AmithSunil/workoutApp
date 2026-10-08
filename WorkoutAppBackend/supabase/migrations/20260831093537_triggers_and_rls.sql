-- WorkoutApp: updated_at triggers and row-level security.
-- Implements BACKEND_DATA_SCHEMA.md section 8.

-- ---------------------------------------------------------------------------
-- updated_at on every table that carries the column
-- ---------------------------------------------------------------------------

do $$
declare
  t record;
begin
  for t in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables tb
        on tb.table_schema = c.table_schema and tb.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name = 'updated_at'
       and tb.table_type = 'BASE TABLE'
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t.table_name || '_set_updated_at', t.table_name
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
--
-- Expo inlines EXPO_PUBLIC_* at build time, so the key shipped in the app is
-- always the publishable/anon key and RLS is the only thing standing between a
-- client and the whole database. Every table therefore has RLS *enabled*.
--
-- The policies below are deliberately open to anon while the app has no auth:
-- identity today is a role held in sessionSlice, not a session token, so an
-- auth.uid()-based policy would simply return zero rows and the app would go
-- dark. The structure is the part that matters — enabling RLS later is then a
-- policy swap, not a schema change.
--
--   !! This is a pre-auth development posture. Do not point a production
--   !! deployment at this project until the policies in
--   !! supabase/future/20260901000001_auth_rls.sql.pending replace these.
--
-- That file holds the real per-role policy set (client reads own rows, trainer
-- reads their assigned clients' rows, foods and exercises public) written
-- against auth.uid(), ready to apply once sign-in exists.

do $$
declare
  t record;
begin
  for t in
    select table_name
      from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security', t.table_name);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t.table_name || '_dev_select', t.table_name
    );
    execute format(
      'create policy %I on public.%I for insert to anon, authenticated with check (true)',
      t.table_name || '_dev_insert', t.table_name
    );
    execute format(
      'create policy %I on public.%I for update to anon, authenticated using (true) with check (true)',
      t.table_name || '_dev_update', t.table_name
    );
    execute format(
      'create policy %I on public.%I for delete to anon, authenticated using (true)',
      t.table_name || '_dev_delete', t.table_name
    );
  end loop;
end;
$$;
