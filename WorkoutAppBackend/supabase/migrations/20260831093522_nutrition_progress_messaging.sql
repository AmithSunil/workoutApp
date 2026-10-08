-- WorkoutApp: nutrition, progress, communication and trainer triage.
-- Implements BACKEND_DATA_SCHEMA.md sections 3-6, plus the derived views for
-- section 7's computed fields.

-- ---------------------------------------------------------------------------
-- 3. Nutrition
-- ---------------------------------------------------------------------------

create table foods (
  id             text primary key,
  name           text not null,
  brand          text,
  serving_label  text not null,
  calories       integer not null,
  protein        integer not null,
  carbs          integer not null,
  fat            integer not null,
  emoji          text not null default '',
  frequent       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Quick-add carousel reads this; the trigram index backs the food search box.
create index foods_frequent_idx on foods (frequent) where frequent;
create index foods_name_idx     on foods (lower(name));

create table nutrition_days (
  id                text primary key,
  client_id         text not null references client_profiles (id) on delete cascade,
  date              date not null,
  -- Targets are snapshotted per day: changing a client's macro targets must not
  -- silently rewrite what they were being asked to hit three months ago.
  target_calories   integer not null,
  target_protein    integer not null,
  target_carbs      integer not null,
  target_fat        integer not null,
  -- Consumed is maintained by trigger from food_entries (plan section 7.5).
  consumed_calories integer not null default 0,
  consumed_protein  integer not null default 0,
  consumed_carbs    integer not null default 0,
  consumed_fat      integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (client_id, date)
);

create index nutrition_days_client_date_idx on nutrition_days (client_id, date desc);

create table food_entries (
  id                text primary key,
  nutrition_day_id  text not null references nutrition_days (id) on delete cascade,
  client_id         text not null references client_profiles (id) on delete cascade,
  date              date not null,
  slot              meal_slot not null,
  food_id           text references foods (id) on delete set null,
  name              text not null,
  servings          numeric(6,2) not null check (servings > 0),
  calories          integer not null,
  protein           integer not null,
  carbs             integer not null,
  fat               integer not null,
  source            food_entry_source not null default 'search',
  logged_at         timestamptz not null default now()
);

create index food_entries_day_idx    on food_entries (nutrition_day_id, logged_at);
create index food_entries_client_idx on food_entries (client_id, date desc);

-- Keeps nutrition_days.consumed_* in step with its entries.
create function public.refresh_nutrition_day_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  day_id text := coalesce(new.nutrition_day_id, old.nutrition_day_id);
begin
  update public.nutrition_days d
     set consumed_calories = t.calories,
         consumed_protein  = t.protein,
         consumed_carbs    = t.carbs,
         consumed_fat      = t.fat,
         updated_at        = now()
    from (
      select coalesce(sum(calories), 0)::int as calories,
             coalesce(sum(protein),  0)::int as protein,
             coalesce(sum(carbs),    0)::int as carbs,
             coalesce(sum(fat),      0)::int as fat
        from public.food_entries
       where nutrition_day_id = day_id
    ) t
   where d.id = day_id;
  return null;
end;
$$;

create trigger food_entries_totals
after insert or update or delete on food_entries
for each row execute function public.refresh_nutrition_day_totals();

-- Ephemeral parser output. Items stay jsonb: it is a throwaway payload with a
-- TTL, never queried by field, and never a foreign key target.
create table ai_food_suggestions (
  id          text primary key,
  client_id   text references client_profiles (id) on delete cascade,
  transcript  text not null,
  confidence  numeric(4,3) not null check (confidence between 0 and 1),
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '24 hours'
);

create index ai_food_suggestions_expiry_idx on ai_food_suggestions (expires_at);

-- ---------------------------------------------------------------------------
-- 4. Progress
-- ---------------------------------------------------------------------------

create table body_metrics (
  id            text primary key,
  client_id     text not null references client_profiles (id) on delete cascade,
  date          date not null,
  weight_kg     numeric(5,2) not null,
  body_fat_pct  numeric(4,1),
  waist_cm      numeric(5,1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (client_id, date)
);

create index body_metrics_client_date_idx on body_metrics (client_id, date desc);

create table progress_photos (
  id          text primary key,
  client_id   text not null references client_profiles (id) on delete cascade,
  date        date not null,
  pose        photo_pose not null,
  uri         text not null,
  weight_kg   numeric(5,2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index progress_photos_client_date_idx on progress_photos (client_id, date desc);

create table habits (
  id          text primary key,
  client_id   text not null references client_profiles (id) on delete cascade,
  title       text not null,
  icon        text not null default '',
  cadence     habit_cadence not null default 'daily',
  created_by  habit_creator not null default 'client',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index habits_client_idx on habits (client_id);

-- completedDates[] as rows: toggling one day is then an insert or a delete
-- rather than a read-modify-write of a growing array.
create table habit_completions (
  habit_id      text not null references habits (id) on delete cascade,
  date          date not null,
  completed_at  timestamptz not null default now(),
  primary key (habit_id, date)
);

create index habit_completions_date_idx on habit_completions (date);

-- ---------------------------------------------------------------------------
-- 5. Communication
-- ---------------------------------------------------------------------------

create table threads (
  id                    text primary key,
  client_id             text not null references client_profiles (id) on delete cascade,
  trainer_id            text not null references trainer_profiles (id) on delete cascade,
  last_message_preview  text not null default '',
  last_message_at       timestamptz,
  unread_for_trainer    integer not null default 0,
  unread_for_client     integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (client_id, trainer_id)
);

create index threads_last_message_idx on threads (last_message_at desc);

create table messages (
  id                   text primary key,
  thread_id            text not null references threads (id) on delete cascade,
  sender_id            text not null references users (id) on delete cascade,
  body                 text not null default '',
  -- MessageAttachment is a discriminated union of at most one value, so it gets
  -- columns plus a check rather than a child table or an opaque jsonb blob.
  attachment_kind      attachment_kind,
  attachment_log_id    text references workout_logs (id) on delete set null,
  attachment_date      date,
  attachment_uri       text,
  sent_at              timestamptz not null default now(),
  read_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint messages_attachment_shape check (
    (attachment_kind is null   and attachment_log_id is null and attachment_date is null and attachment_uri is null)
    or (attachment_kind = 'workout'   and attachment_log_id is not null and attachment_date is null     and attachment_uri is null)
    or (attachment_kind = 'nutrition' and attachment_date   is not null and attachment_log_id is null   and attachment_uri is null)
    or (attachment_kind = 'photo'     and attachment_uri    is not null and attachment_log_id is null   and attachment_date is null)
  )
);

create index messages_thread_sent_idx on messages (thread_id, sent_at);
create index messages_unread_idx      on messages (thread_id) where read_at is null;

-- Denormalises threads.last_message_* on write (plan section 7.4).
create function public.refresh_thread_preview()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t_id text := coalesce(new.thread_id, old.thread_id);
begin
  update public.threads th
     set last_message_preview = coalesce(m.body, ''),
         last_message_at      = m.sent_at,
         updated_at           = now()
    from (
      select body, sent_at
        from public.messages
       where thread_id = t_id
       order by sent_at desc
       limit 1
    ) m
   where th.id = t_id;
  return null;
end;
$$;

create trigger messages_thread_preview
after insert or update or delete on messages
for each row execute function public.refresh_thread_preview();

-- ---------------------------------------------------------------------------
-- 6. Trainer triage
-- ---------------------------------------------------------------------------

create table red_flag_alerts (
  id           text primary key,
  client_id    text not null references client_profiles (id) on delete cascade,
  kind         alert_kind not null,
  severity     alert_severity not null,
  title        text not null,
  detail       text not null default '',
  raised_at    timestamptz not null default now(),
  resolved     boolean not null default false,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index red_flag_alerts_open_idx on red_flag_alerts (client_id, resolved);

create table check_ins (
  id                  text primary key,
  client_id           text not null references client_profiles (id) on delete cascade,
  week_of             date not null,
  submitted_at        timestamptz not null default now(),
  status              check_in_status not null default 'pending',
  weight_change_kg    numeric(5,2) not null default 0,
  avg_calories        integer not null default 0,
  target_calories     integer not null default 0,
  sessions_completed  integer not null default 0,
  sessions_planned    integer not null default 0,
  avg_rpe             numeric(3,1) not null default 0,
  client_note         text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (client_id, week_of)
);

create index check_ins_client_week_idx on check_ins (client_id, week_of desc);
create index check_ins_status_idx      on check_ins (status);

-- TrainerSummary is a pure derivation of live tables, so it is a view rather
-- than a cached table — no invalidation to get wrong.
create view v_trainer_summary as
  select t.id as trainer_id,
         (select count(*) from client_profiles c where c.trainer_id = t.id) as active_clients,
         (select count(*) from check_ins ci
            join client_profiles c on c.id = ci.client_id
           where c.trainer_id = t.id and ci.status = 'pending') as pending_check_ins,
         (select coalesce(sum(th.unread_for_trainer), 0) from threads th
           where th.trainer_id = t.id) as unread_messages,
         (select count(*) from red_flag_alerts a
            join client_profiles c on c.id = a.client_id
           where c.trainer_id = t.id and not a.resolved and a.severity = 'critical') as critical_alerts,
         (select coalesce(round(avg(c.compliance_score)), 0) from client_profiles c
           where c.trainer_id = t.id) as weekly_compliance_avg
  from trainer_profiles t;
