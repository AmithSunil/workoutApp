-- Single-table inserts should not need an RPC just to get an id.
--
-- Sending a message, adding a habit, logging a weight: each is one row and
-- PostgREST handles it fine, except that the primary key is text with no
-- default, which would force the client to mint ids -- and a client-minted id
-- is a collision waiting to happen across two devices. A column default closes
-- that without adding a function per table.
--
-- next_id is SECURITY DEFINER (it writes to id_sequences, which callers cannot
-- touch directly), so the inserting role needs EXECUTE for the default to fire.
grant execute on function public.next_id(text) to anon, authenticated;

alter table routines                     alter column id set default public.next_id('rt');
alter table routine_days                 alter column id set default public.next_id('rd');
alter table routine_exercises            alter column id set default public.next_id('rx');
alter table routine_assignments          alter column id set default public.next_id('ra');
alter table routine_assignment_days      alter column id set default public.next_id('ad');
alter table routine_assignment_exercises alter column id set default public.next_id('ax');
alter table session_exercises            alter column id set default public.next_id('pe');
alter table workout_logs                 alter column id set default public.next_id('wl');
alter table logged_exercises             alter column id set default public.next_id('le');
alter table logged_sets                  alter column id set default public.next_id('ls');
alter table food_entries                 alter column id set default public.next_id('fe');
alter table body_metrics                 alter column id set default public.next_id('bm');
alter table progress_photos              alter column id set default public.next_id('pp');
alter table habits                       alter column id set default public.next_id('h');
alter table messages                     alter column id set default public.next_id('m');
alter table red_flag_alerts              alter column id set default public.next_id('al');
alter table check_ins                    alter column id set default public.next_id('ci');
