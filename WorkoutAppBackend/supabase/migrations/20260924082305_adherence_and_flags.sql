-- Adherence and red flags, recomputed every 15 minutes by pg_cron.
--
-- Before this, client_profiles.compliance_* were seed values nothing ever
-- updated, and the only alert anything raised was intake-complete.
-- Both functions are cron-only: execute is revoked from the API roles.

create extension if not exists pg_cron;

-- Score = share of the trailing 7 days the client did what their coach tracks:
--   nutrition: days with food logged / days elapsed
--   workouts:  sessions done / routine weekdays elapsed (capped at 100%)
-- Averaged when the coach tracks both (or has not chosen, or there is no coach).
-- Today only counts once it is logged, so the day is not held against anyone
-- before it is over. The window starts no earlier than joined_at.
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
           case when s.score is null then 'yellow'
                when s.score >= 80 then 'green'
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

-- Raises missed-logs, weight-stall and calorie-deficit-miss for linked,
-- coached clients. A kind is not raised again for a client while one is open,
-- or within 7 days of the last one, so resolving a flag quiets it for a week.
-- The dashboard already hides kinds outside the coach's tracking mode, but the
-- nutrition kinds are skipped here too so they never count toward the badge.
create or replace function public.raise_red_flags()
returns void
language sql
security invoker
set search_path = public
as $$
  with coached as (
    select c.*, coalesce(tp.tracks::text, 'both') as mode, t.today
      from client_profiles c
      join users u on u.id = c.id and u.auth_user_id is not null
      join trainer_profiles tp on tp.id = c.trainer_id
      cross join (select (now() at time zone 'Asia/Kolkata')::date as today) t
  ),
  flags as (
    -- nothing eaten on the log for three days running
    select c.id as client_id, 'missed-logs' as kind, 'critical' as severity,
           case when l.last is null then 'No food logged yet'
                else format('No food logged in %s days', c.today - l.last) end as title,
           case when l.last is null then format('Joined %s and nothing logged since.', to_char(c.joined_at, 'Mon FMDD'))
                else format('Last entry %s.', to_char(l.last, 'Mon FMDD')) end as detail
      from coached c
      cross join lateral (
        select max(n.date) as last from nutrition_days n
         where n.client_id = c.id and n.consumed_calories > 0
      ) l
     where c.mode in ('nutrition', 'both')
       and c.joined_at <= c.today - 3
       and coalesce(l.last, c.joined_at - 1) < c.today - 2

    union all

    -- 3 weeks of weigh-ins moving < 0.3 kg toward a goal more than 1 kg away
    select c.id, 'weight-stall', 'warning',
           'Weight flat for 3 weeks',
           format('Moved %s kg toward goal in %s days, %s kg still to go.',
                  round(sign(c.target_weight_kg - w.latest) * (w.latest - w.first), 1),
                  w.span, round(abs(c.target_weight_kg - w.latest), 1))
      from coached c
      cross join lateral (
        select max(b.date) - min(b.date) as span,
               (array_agg(b.weight_kg order by b.date desc))[1] as latest,
               (array_agg(b.weight_kg order by b.date))[1] as first
          from body_metrics b
         where b.client_id = c.id and b.date >= c.today - 21
      ) w
     where c.target_weight_kg is not null
       and w.span >= 14
       and abs(c.target_weight_kg - w.latest) > 1
       and sign(c.target_weight_kg - w.latest) * (w.latest - w.first) < 0.3

    union all

    -- last week's logged days averaged more than 10% off the calorie target
    select c.id, 'calorie-deficit-miss', 'warning',
           format('Averaging %s kcal %s target', abs(k.diff), case when k.diff > 0 then 'over' else 'under' end),
           format('Across %s logged days last week.', k.days)
      from coached c
      cross join lateral (
        select count(*) as days,
               round(avg(n.consumed_calories - n.target_calories))::int as diff,
               avg(n.target_calories) as target
          from nutrition_days n
         where n.client_id = c.id and n.consumed_calories > 0
           and n.date between c.today - 7 and c.today - 1
      ) k
     where c.mode in ('nutrition', 'both')
       and k.days >= 4
       and abs(k.diff) > 0.1 * k.target
  )
  insert into red_flag_alerts (client_id, kind, severity, title, detail)
  select f.client_id, f.kind::alert_kind, f.severity::alert_severity, f.title, f.detail
    from flags f
   where not exists (
     select 1 from red_flag_alerts a
      where a.client_id = f.client_id and a.kind = f.kind::alert_kind
        and (not a.resolved or a.raised_at > now() - interval '7 days')
   );
$$;

revoke execute on function public.refresh_compliance() from public, anon, authenticated;
revoke execute on function public.raise_red_flags() from public, anon, authenticated;

select cron.schedule(
  'adherence-and-flags',
  '*/15 * * * *',
  'select public.refresh_compliance(); select public.raise_red_flags();'
);

select public.refresh_compliance();
select public.raise_red_flags();
