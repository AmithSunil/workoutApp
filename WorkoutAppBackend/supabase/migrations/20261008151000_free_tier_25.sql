-- Free coach tier set to 25 clients (Sneha, 2026-10-08). Plans and pricing are
-- hidden in the app until after the MVP, so this is every new coach's cap.
-- invite_client enforces it through seat_limit(); existing rosters are untouched.
update public.plans set max_clients = 25 where code = 'coach_free';
