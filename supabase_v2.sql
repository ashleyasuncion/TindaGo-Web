-- TindaGo Supabase Schema v2 — run ONCE in Dashboard SQL Editor
-- Multi-tenant: every row carries user_id = auth.uid()
-- Keys: (user_id,id) or (user_id,date) for daily_entries/end_of_day_data
-- Mirrors AppDatabase v13 + db_indexed.js v13; expect Success No rows returned
create extension if not exists pgcrypto;
create table if not exists public.products (
 id text not null, user_id uuid not null references auth.users(id) on delete cascade,
 name text not null default '', quantity double precision not null default 0,
 cost_price double precision not null default 0, selling_price double precision not null default 0,
 unit text not null default 'piece', low_stock_threshold double precision not null default 5,
 category text not null default '', subcategory text not null default '',
 brand text not null default '', package_size text not null default '',
 primary key (user_id, id)
);
alter table public.products enable row level security;
drop policy if exists "products_is_owner" on public.products;
create policy "products_is_owner" on public.products for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.customer_debts (
 id bigint not null, user_id uuid not null references auth.users(id) on delete cascade,
 customer_name text not null default '', amount double precision not null default 0,
 remaining_balance double precision not null default 0, created_at bigint not null default 0,
 credit_limit double precision, phone_number text not null default '', sms_opt_in smallint,
 primary key (user_id, id)
);
alter table public.customer_debts enable row level security;
drop policy if exists "customer_debts_is_owner" on public.customer_debts;
create policy "customer_debts_is_owner" on public.customer_debts for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.debt_payments (
 id bigint not null, user_id uuid not null references auth.users(id) on delete cascade,
 debt_id bigint not null, amount double precision not null default 0, timestamp bigint not null default 0, note text,
 primary key (user_id, id)
);
alter table public.debt_payments enable row level security;
drop policy if exists "debt_payments_is_owner" on public.debt_payments;
create policy "debt_payments_is_owner" on public.debt_payments for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.debt_transactions (
 id bigint not null, user_id uuid not null references auth.users(id) on delete cascade,
 debt_id bigint not null, type text not null default 'debt', description text,
 amount double precision not null default 0, timestamp bigint not null default 0,
 primary key (user_id, id)
);
alter table public.debt_transactions enable row level security;
drop policy if exists "debt_transactions_is_owner" on public.debt_transactions;
create policy "debt_transactions_is_owner" on public.debt_transactions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.specific_sales (
 id bigint not null, user_id uuid not null references auth.users(id) on delete cascade,
 date text not null default '', description text not null default '', amount double precision not null default 0,
 quantity double precision not null default 1, customer_name text, profit double precision not null default 0,
 timestamp bigint not null default 0, transaction_id bigint not null default 0, payment_method text,
 primary key (user_id, id)
);
alter table public.specific_sales enable row level security;
drop policy if exists "specific_sales_is_owner" on public.specific_sales;
create policy "specific_sales_is_owner" on public.specific_sales for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.expenses (
 id bigint not null, user_id uuid not null references auth.users(id) on delete cascade,
 date text not null default '', category text not null default 'other',
 amount double precision not null default 0, note text not null default '', timestamp bigint not null default 0,
 primary key (user_id, id)
);
alter table public.expenses enable row level security;
drop policy if exists "expenses_is_owner" on public.expenses;
create policy "expenses_is_owner" on public.expenses for all using (auth.uid()=user_id) with check (auth.uid()=user_id);


create table if not exists public.daily_entries (
 date text not null, user_id uuid not null references auth.users(id) on delete cascade,
 stock_expenses double precision not null default 0, earnings double precision not null default 0,
 primary key (user_id, date)
);
alter table public.daily_entries enable row level security;
drop policy if exists "daily_entries_is_owner" on public.daily_entries;
create policy "daily_entries_is_owner" on public.daily_entries for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.end_of_day_data (
 date text not null, user_id uuid not null references auth.users(id) on delete cascade,
 cash_in_drawer double precision not null default 0, stock_check_done boolean not null default false,
 debt_payments_done boolean not null default false, finished boolean not null default false,
 recorded_sales double precision not null default 0, actual_sales double precision not null default 0,
 sales_diff double precision not null default 0, profit double precision not null default 0,
 expenses double precision not null default 0, net_profit double precision not null default 0,
 primary key (user_id, date)
);
alter table public.end_of_day_data enable row level security;
drop policy if exists "end_of_day_data_is_owner" on public.end_of_day_data;
create policy "end_of_day_data_is_owner" on public.end_of_day_data for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.restock_log (
 id text not null, user_id uuid not null references auth.users(id) on delete cascade,
 date text not null default '', items_json text not null default '[]', total_cost double precision not null default 0,
 primary key (user_id, id)
);
alter table public.restock_log enable row level security;
drop policy if exists "restock_log_is_owner" on public.restock_log;
create policy "restock_log_is_owner" on public.restock_log for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table if not exists public.sms_log (
 id bigint not null, user_id uuid not null references auth.users(id) on delete cascade,
 debt_id bigint not null default 0, customer_name text not null default '',
 phone_number text not null default '', type text not null default 'reminder',
 message_body text not null default '', status text not null default 'sent', timestamp bigint not null default 0,
 primary key (user_id, id)
);
alter table public.sms_log enable row level security;
drop policy if exists "sms_log_is_owner" on public.sms_log;
create policy "sms_log_is_owner" on public.sms_log for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- v13 fractional migration (idempotent, safe to re-run)
DO $$ -- v13 fractional
BEGIN
  BEGIN ALTER TABLE public.products ALTER COLUMN quantity TYPE double precision USING quantity::double precision; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.products ALTER COLUMN low_stock_threshold TYPE double precision USING low_stock_threshold::double precision; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE public.specific_sales ALTER COLUMN quantity TYPE double precision USING quantity::double precision; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
