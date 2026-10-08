-- Brings a fresh build up to what the live project already runs; a no-op there.
-- Found 2026-10-08 by comparing a clean replay of this folder with the live
-- catalog, which matched everywhere else.

-- Live has RLS on (Supabase's auto-enable turned it on). No policies on purpose:
-- only next_id(), a SECURITY DEFINER owned by postgres, touches this table.
alter table public.id_sequences enable row level security;

-- Live rejects a non-array payload; the folder's copy would crash on it instead.
create or replace function public.add_food_entries(p_entries jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  e jsonb; v_client text; v_date date;
begin
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    raise exception 'No entries supplied';
  end if;

  for e in select * from jsonb_array_elements(p_entries) loop
    v_client := e->>'clientId';
    v_date   := (e->>'date')::date;
    perform public.get_or_create_nutrition_day(v_client, v_date);

    insert into public.food_entries
      (id, nutrition_day_id, client_id, date, slot, food_id, name, servings,
       calories, protein, carbs, fat, source, logged_at)
    values (coalesce(e->>'id', public.next_id('fe')),
            'nd-' || v_client || '-' || to_char(v_date, 'YYYY-MM-DD'),
            v_client, v_date, (e->>'slot')::public.meal_slot, e->>'foodId', e->>'name',
            (e->>'servings')::numeric, (e->>'calories')::int, (e->>'protein')::int,
            (e->>'carbs')::int, (e->>'fat')::int,
            coalesce((e->>'source')::public.food_entry_source, 'search'),
            coalesce((e->>'loggedAt')::timestamptz, now()));
  end loop;

  -- The day the last entry landed on is the one the screen is showing.
  return public.nutrition_day_json(v_client, v_date);
end;
$$;
