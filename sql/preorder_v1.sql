-- ============================================================================
-- TindaGo — Phase 6 (A): Digital Customer Pre-Ordering / Temp ID
-- New file; does NOT modify supabase_v2.sql (which stays frozen).
-- Applies ONLY to the shared Supabase project via the SQL editor.
--   URL   : https://gncnluxjrpmbjmtzcwsv.supabase.co
--   Action: run once (idempotent; safe to re-run).
--
-- What this adds
--   1) public.pre_orders       — anonymous customers place orders here.
--   2) public.store_profiles   — public store identity shown on the landing page.
--   3) get_public_products()   — SECURITY DEFINER RPC: narrow public projection
--                                of products. NEVER exposes cost_price.
--
-- RLS summary (the ONLY policy difference from supabase_v2.sql):
--   pre_orders   : INSERT open to anon/authenticated; SELECT/UPDATE owner-only.
--   store_profiles: SELECT open to everyone; write owner-only.
--   products     : unchanged (owner-only) — read by anon ONLY through the RPC.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. pre_orders
-- ----------------------------------------------------------------------------
create table if not exists public.pre_orders (
  id bigint not null,                       -- per-store sequential id (client-generated,
                                            -- mirroring how other tables pick ids)
  user_id uuid not null references auth.users(id) on delete cascade,  -- store owner
  temp_id text not null default '',         -- human-friendly, e.g. "TGO-7A2K9"
  items_json text not null default '[]',    -- JSON array of {id,name,unit,price,qty}
  total_amount double precision not null default 0,
  payment_method text not null default 'cash',    -- cash | gcash | maya (intent only)
  payment_status text not null default 'unpaid',  -- unpaid | paid
  status text not null default 'pending',  -- pending -> preparing -> ready -> fulfilled | cancelled
  customer_note text not null default '',
  created_at bigint not null default 0,
  expires_at bigint not null default 0,     -- optional auto-expire (0 = none)
  primary key (user_id, id)
);

alter table public.pre_orders enable row level security;

-- anonymous customers can place an order (intentional: the only public insert
-- surface in the whole project — NO select is opened to them)
drop policy if exists "pre_orders_public_insert" on public.pre_orders;
create policy "pre_orders_public_insert" on public.pre_orders
  for insert to anon, authenticated with check (true);

-- only the store owner reads their orders
drop policy if exists "pre_orders_is_owner" on public.pre_orders;
create policy "pre_orders_is_owner" on public.pre_orders
  for select using (auth.uid() = user_id);

-- only the store owner updates status / payment
drop policy if exists "pre_orders_owner_update" on public.pre_orders;
create policy "pre_orders_owner_update" on public.pre_orders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists pre_orders_owner_status_idx
  on public.pre_orders (user_id, status, created_at desc);
create index if not exists pre_orders_temp_id_idx on public.pre_orders (temp_id);

-- ----------------------------------------------------------------------------
-- 1b. fulfilled_at — timestamp written by the Android app when it validates or
--     cancels an order (SyncRepository.syncPreOrderStatus). This column was NOT
--     in the original preorder_v1 applied to the project, so IF NOT EXISTS keeps
--     this script re-runnable against the already-provisioned database.
--     Until it is run, the Android client degrades gracefully to a
--     status/payment_status-only PATCH (see SyncRepository.syncPreOrderStatus).
-- ----------------------------------------------------------------------------
alter table public.pre_orders
  add column if not exists fulfilled_at bigint not null default 0;

-- ----------------------------------------------------------------------------
-- 2. store_profiles — public store identity for the customer landing page
-- ----------------------------------------------------------------------------
create table if not exists public.store_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null default '',
  owner_name text not null default '',
  address text not null default '',
  phone_display text not null default '',   -- show-only text; never a raw private number
  is_preorder_enabled boolean not null default false,
  updated_at bigint not null default 0
);

alter table public.store_profiles enable row level security;

-- anyone (anon incl.) may read — needed for the public landing page;
-- only the enumerated columns are ever selected by the web page
drop policy if exists "store_profiles_public_select" on public.store_profiles;
create policy "store_profiles_public_select" on public.store_profiles
  for select using (true);

-- only the owner writes their own profile
drop policy if exists "store_profiles_owner_all" on public.store_profiles;
create policy "store_profiles_owner_all" on public.store_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. get_public_products(store_uid) — narrow, read-only public projection.
--    SECURITY DEFINER bypasses RLS ONLY inside this function. It returns the
--    minimal field set the customer page needs and NEVER exposes cost_price,
--    low_stock_threshold, category/subcategory internals, etc.
-- ----------------------------------------------------------------------------
create or replace function public.get_public_products(p_store_uuid uuid)
returns table (
  id text, name text, unit text, price double precision,
  quantity double precision, package_size text, brand text
) language sql security definer stable as
$$
  select id, name, unit, selling_price, quantity, package_size, brand
  from public.products
  where user_id = p_store_uuid and quantity > 0
  order by name asc;
$$;

revoke all on function public.get_public_products(uuid) from public;
grant execute on function public.get_public_products(uuid) to anon, authenticated;

-- ============================================================================
-- END Phase 6 (A) schema — idempotent, reversible:
--   drop table if exists public.pre_orders;
--   drop table if exists public.store_profiles;
--   drop function if exists public.get_public_products(uuid);
-- ============================================================================
