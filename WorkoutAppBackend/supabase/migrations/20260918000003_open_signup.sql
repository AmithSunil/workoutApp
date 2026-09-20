-- Signup is open, so the gate has nothing left to refuse.
--
-- hook_require_invite (20260915000004) turned down any signup whose address was
-- not already a pending client. With /welcome offering "I'm a coach" and "I'm
-- training on my own", that is exactly backwards: the people it refuses are now
-- the intended new users. It is deleted rather than loosened -- a hook that
-- returns '{}' for everything is a hook nobody can tell is dead.
--
-- KEEP IT UNCONFIGURED: Dashboard -> Authentication -> Hooks -> Before User
-- Created must stay empty. Auth calls the hook by name; pointing it at a
-- function that no longer exists fails every signup.
--
-- link_auth_user and its on_auth_user_created trigger are untouched. An invited
-- address must still be linked inside account creation, before the app's first
-- identity check -- that path is unchanged and still the one that wins.

drop function public.hook_require_invite(jsonb);
