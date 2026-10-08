-- Free coach tier raised from 2 to 30 clients (Sneha, 2026-09-29, "for now").
update public.plans set max_clients = 30 where code = 'coach_free';
