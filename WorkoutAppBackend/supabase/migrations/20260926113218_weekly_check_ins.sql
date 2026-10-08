-- Weekly check-ins, written by pg_cron every Monday for the week just ended.
--
-- Nothing created check_ins before this; the coach's review queue only ever
-- showed seed rows. The client does nothing: the numbers come from what they
-- logged, and client_note stays empty.

create or replace function public.write_weekly_check_ins()
returns void
language sql
security invoker
set search_path = public
as $$
  with wk as (
    -- the Monday of last week; ponytail: one timezone for everyone, as in refresh_compliance
    select date_trunc('week', (now() at time zone 'Asia/Kolkata')::date)::date - 7 as start
  )
  insert into check_ins (client_id, week_of, weight_change_kg, avg_calories, target_calories,
                         sessions_completed, sessions_planned)
  select c.id,
         wk.start,
         -- last weigh-in by the end of the week vs the last one before it began
         coalesce((select b.weight_kg from body_metrics b
                    where b.client_id = c.id and b.date <= wk.start + 6 order by b.date desc limit 1)
                - (select b.weight_kg from body_metrics b
                    where b.client_id = c.id and b.date < wk.start order by b.date desc limit 1), 0),
         coalesce((select round(avg(n.consumed_calories))::int from nutrition_days n
                    where n.client_id = c.id and n.consumed_calories > 0
                      and n.date between wk.start and wk.start + 6), 0),
         c.target_calories,
         (select count(distinct w.date) from workout_logs w
           where w.client_id = c.id and w.date between wk.start and wk.start + 6),
         (select count(*) from routine_assignments ra
            join routine_days rd on rd.routine_id = ra.routine_id
           where ra.client_id = c.id)
    from client_profiles c
    join users u on u.id = c.id and u.auth_user_id is not null
    cross join wk
   where c.trainer_id is not null
     and c.joined_at <= wk.start + 6
  on conflict (client_id, week_of) do nothing;
$$;

revoke execute on function public.write_weekly_check_ins() from public, anon, authenticated;

-- 00:30 UTC Monday = 06:00 IST Monday
select cron.schedule('weekly-check-ins', '30 0 * * 1', 'select public.write_weekly_check_ins();');

select public.write_weekly_check_ins();
