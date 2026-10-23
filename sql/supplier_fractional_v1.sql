-- TindaGo sync repair v1 — supplier + fractional quantity columns
-- Run ONCE in the Supabase Dashboard SQL Editor. Safe to re-run.
--
-- Why: the Android app pushes products with a `supplier` field and pushes
-- fractional quantities (e.g. 0.25 kg rice). Older databases created before
-- v13/supplier support have no supplier column and still use integer quantity
-- columns, so PostgREST rejects the products and specific_sales batches.

alter table public.products
  add column if not exists supplier text;

-- Legacy integer columns → double precision. If already double, this is a no-op
-- for the data and keeps the statement idempotent.
alter table public.products
  alter column quantity type double precision using quantity::double precision;
alter table public.products
  alter column low_stock_threshold type double precision using low_stock_threshold::double precision;
alter table public.specific_sales
  alter column quantity type double precision using quantity::double precision;

-- Older specific_sales tables may predate the multi-item checkout columns.
alter table public.specific_sales
  add column if not exists transaction_id bigint not null default 0;
alter table public.specific_sales
  add column if not exists payment_method text;

-- Pre-order customer names (seed and app inbox).
alter table public.pre_orders
  add column if not exists customer_name text not null default '';

-- PostgREST caches table shapes. Without this, the app can keep receiving
-- "column supplier does not exist" until the cache expires or the project is
-- restarted.
notify pgrst, 'reload schema';
