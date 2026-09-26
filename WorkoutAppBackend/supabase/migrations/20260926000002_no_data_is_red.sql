-- A client with nothing to score used to be stored as score 0 + status yellow,
-- so two clients at 0% showed different colours. No data now means 0% and red.
-- (score is null -> falls through to 'red', matching the stored coalesce(score, 0).)

alter table public.client_profiles alter column compliance_status set default 'red';

create or replace function public.refresh_compliance()
returns void
language sql
security invoker
set search_path = public
as $$
  with activity as (
    select client_id, date, 'food' as kind from nutrition_days where consumed_calories > 0
    union
    select client_id, date, 'workout' from workout_logs
  ),
  base as (
    select c.id,
           t.today,
           greatest(t.today - 6, c.joined_at) as start,
           coalesce(tp.tracks::text, 'both') as mode,
           array(select rd.weekday::text
                   from routine_assignments ra
                   join routine_days rd on rd.routine_id = ra.routine_id
                  where ra.client_id = c.id) as train_days
      from client_profiles c
      -- ponytail: one timezone for everyone; store a per-user tz if clients live elsewhere
      cross join (select (now() at time zone 'Asia/Kolkata')::date as today) t
      left join trainer_profiles tp on tp.id = c.trainer_id
  ),
  counts as (
    select b.*,
           b.today - b.start as full_days,
           (select count(*) from activity a
             where a.client_id = b.id and a.kind = 'food' and a.date >= b.start and a.date < b.today) as food_before,
           (exists (select 1 from activity a
             where a.client_id = b.id and a.kind = 'food' and a.date = b.today))::int as food_today,
           (select count(*) from generate_series(b.start, b.today - 1, interval '1 day') g
             where to_char(g, 'dy') = any (b.train_days)) as planned_before,
           (to_char(b.today, 'dy') = any (b.train_days) and exists (select 1 from activity a
             where a.client_id = b.id and a.kind = 'workout' and a.date = b.today))::int as planned_today,
           (select count(*) from activity a
             where a.client_id = b.id and a.kind = 'workout' and a.date between b.start and b.today) as sessions
      from base b
  ),
  ratios as (
    select id, today,
           case when mode in ('nutrition', 'both')
                then (food_before + food_today)::numeric / nullif(full_days + food_today, 0) end as nut,
           case when mode in ('workout', 'both')
                then least(sessions, planned_before + planned_today)::numeric
                     / nullif(planned_before + planned_today, 0) end as wk
      from counts
  ),
  scored as (
    select r.id,
           s.score,
           -- nothing to score (no routine assigned, joined today) reads as 0% and red,
           -- the same as a client who missed everything: one colour per score
           case when s.score >= 80 then 'green'
                when s.score >= 55 then 'yellow'
                else 'red' end::compliance_status as status,
           greatest((select max(f.logged_at) from food_entries f where f.client_id = r.id),
                    (select max(w.completed_at) from workout_logs w where w.client_id = r.id)) as last_logged_at,
           -- consecutive days with any log, ending today or yesterday
           (with d as (select distinct a.date from activity a where a.client_id = r.id and a.date <= r.today),
                 islands as (select d.date, d.date - (row_number() over (order by d.date))::int as grp from d)
            select count(*) from islands
             where grp = (select grp from islands where date >= r.today - 1 order by date desc limit 1)
           )::int as streak
      from ratios r
      cross join lateral (
        select round(100 * (coalesce(r.nut, 0) + coalesce(r.wk, 0))
                     / nullif((r.nut is not null)::int + (r.wk is not null)::int, 0))::int as score
      ) s
  )
  update client_profiles c
     set compliance_score       = coalesce(s.score, 0),
         compliance_status      = s.status,
         last_logged_at         = s.last_logged_at,
         compliance_streak_days = s.streak
    from scored s
   where s.id = c.id
     -- leave untouched rows alone so updated_at keeps meaning something
     and (c.compliance_score, c.compliance_status, c.last_logged_at, c.compliance_streak_days)
         is distinct from (coalesce(s.score, 0), s.status, s.last_logged_at, s.streak);
$$;

select public.refresh_compliance();
