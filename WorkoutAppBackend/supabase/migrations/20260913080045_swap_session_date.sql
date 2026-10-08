-- Lets a client train a session on a day it was not scheduled for.
--
-- Moving the picked session to a day that already has one would leave the
-- client two workouts on one date and an empty slot behind, so this swaps: the
-- picked session takes the new date, whatever sat on that date inherits the
-- picked session's old one. With no session on the target date it is a plain
-- move. Both rows are dated, so the change is confined to the week in question
-- — the routine template it came from is untouched.
--
-- SECURITY INVOKER like every other write RPC: under the pending policies a
-- client can only reach their own sessions, and this must obey that.

create function public.swap_session_date(p_id text, p_date date)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_client text;
  v_old    date;
begin
  select client_id, scheduled_for into v_client, v_old
    from public.workout_sessions where id = p_id;

  if v_client is null then
    raise exception 'Session % not found', p_id using errcode = 'PT404';
  end if;

  if v_old = p_date then
    return public.workout_session_json(p_id);
  end if;

  -- The displaced session first: it frees the target date before the picked
  -- session lands on it, so the pair is never both on the same day mid-statement.
  update public.workout_sessions
     set scheduled_for = v_old, updated_at = now()
   where client_id = v_client and scheduled_for = p_date and id <> p_id;

  update public.workout_sessions
     set scheduled_for = p_date, updated_at = now()
   where id = p_id;

  return public.workout_session_json(p_id);
end;
$$;

comment on function public.swap_session_date(text, date) is
  'Swaps two of one client''s scheduled sessions between days. NOTE: session ids '
  'are derived from the date they were created for (ws-<client>-<date>), so after '
  'a swap an id no longer matches its row''s date. Ids are opaque keys and logs '
  'reference them, so they are deliberately left alone — but create_workout_session '
  'mints that same id for a fresh session on that date and will collide. Pass an '
  'explicit id when creating a session for a date that has been swapped.';
