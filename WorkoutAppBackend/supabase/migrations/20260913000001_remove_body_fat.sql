-- Removes the body-fat estimate from the product.
--
-- Nothing measures it: there is no caliper entry, no scale integration and no
-- screen that writes it, so the column only ever held fixture numbers the app
-- presented as a trend. Weight and waist stay.
--
-- DESTRUCTIVE: stored body_fat_pct values are deleted.
--
-- No function, view or RPC reads the column, so this is the whole change.

alter table public.body_metrics drop column body_fat_pct;
