-- Guard check for 20260913000004_keep_last_routine.sql: a client's last routine
-- cannot be unassigned, but a cascade from the routine or the client still gets
-- through. Self-contained, so it runs against a THROWAWAY Postgres, never the
-- project -- it creates its own stripped `routines` / `client_profiles` /
-- `routine_assignments` and nothing else the trigger touches:
--
--   initdb -D /tmp/pgdata -U postgres && pg_ctl -D /tmp/pgdata \
--     -o '-k /tmp/pgrun -p 5433 -c listen_addresses=' start
--   psql -h /tmp/pgrun -p 5433 -U postgres -q -f tests/keep_last_routine.sql
--
-- Silence is failure; five PASS notices is a pass.
\set ON_ERROR_STOP on

create table routines (id text primary key);
create table client_profiles (id text primary key);
create table routine_assignments (
  id text primary key,
  routine_id text not null references routines (id) on delete cascade,
  client_id  text not null references client_profiles (id) on delete cascade,
  unique (routine_id, client_id)
);

\ir ../supabase/migrations/20260913000004_keep_last_routine.sql

insert into routines values ('rt-1'),('rt-2');
insert into client_profiles values ('c-1'),('c-2');
insert into routine_assignments values ('ra-1','rt-1','c-1'),('ra-2','rt-1','c-2'),('ra-3','rt-2','c-2');

-- 1. c-1 follows rt-1 and nothing else, so it stays.
do $$ begin
  begin
    delete from routine_assignments where id = 'ra-1';
    raise exception 'FAIL 1: stranding delete was allowed';
  exception when sqlstate 'PT409' then raise notice 'PASS 1: last routine held';
  end;
end $$;

-- 2. c-2 has two, so one can go.
delete from routine_assignments where id = 'ra-3';
do $$ begin
  if exists (select 1 from routine_assignments where id = 'ra-3') then
    raise exception 'FAIL 2: removable assignment survived';
  end if;
  raise notice 'PASS 2: second routine removable';
end $$;

-- 3. The untick branch of assign_routine is the same delete, and is held too.
do $$ begin
  begin
    delete from routine_assignments where routine_id = 'rt-1' and not (client_id = any (array['c-2']));
    raise exception 'FAIL 3: untick stranded a client';
  exception when sqlstate 'PT409' then raise notice 'PASS 3: untick held';
  end;
end $$;

-- 4. Deleting the routine still cascades, though rt-1 is c-1's only one.
delete from routines where id = 'rt-1';
do $$ begin
  if exists (select 1 from routine_assignments where routine_id = 'rt-1') then
    raise exception 'FAIL 4: routine cascade blocked';
  end if;
  raise notice 'PASS 4: routine delete cascades';
end $$;

-- 5. So does deleting the client.
insert into routine_assignments values ('ra-4','rt-2','c-1');
delete from client_profiles where id = 'c-1';
do $$ begin
  if exists (select 1 from routine_assignments where client_id = 'c-1') then
    raise exception 'FAIL 5: client cascade blocked';
  end if;
  raise notice 'PASS 5: client delete cascades';
end $$;
