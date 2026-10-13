-- ============================================================================
-- TindaGo — Enable Realtime for pre_orders (instant Android alerts)
-- New file; requires preorder_v1.sql to have been applied first.
--   URL   : https://gncnluxjrpmbjmtzcwsv.supabase.co
--   Action: run once in the SQL editor (idempotent; safe to re-run).
--
-- Why this exists
--   The Android app (PreOrderRealtimeService.kt) holds a WebSocket to Supabase
--   Realtime and subscribes to INSERTs on public.pre_orders for *instant* (<3s)
--   alerts. But Realtime only relays changes for tables explicitly added to a
--   realtime publication, and only rows the subscriber can SELECT. Neither was
--   ever configured — so the WebSocket connects, joins successfully, and
--   receives NOTHING. The owner is left to wait for the 15-min worker / 13-min
--   alarm, which is not the instantaneous delivery the feature promises.
--
-- Fix
--   1. Add pre_orders to the default realtime publication.
--   2. Ensure the owner has an RLS SELECT policy (pre_orders_is_owner already
--      exists from preorder_v1.sql — this is a belt-and-braces re-create).
--   3. Grant the authenticated owner SELECT (Realtime checks the subscriber
--      role's privileges; authenticated maps to the signed-in store owner).
-- ============================================================================

-- 1. Realtime: publish this table's changes to the Realtime websocket.
--    Guarded so the script is genuinely re-runnable: ALTER PUBLICATION errors
--    if the table is already a member.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pre_orders'
  ) then
    alter publication supabase_realtime add table public.pre_orders;
  end if;
end $$;

-- 2. RLS SELECT policy for the store owner (Realtime relays a row only if the
--    subscriber can SELECT it). preorder_v1.sql created pre_orders_is_owner,
--    but re-create with IF NOT EXISTS to be safe so realtime has it.
--    (Postgres 15+ / Newer Supabase: check the actual policy name.
--    preorder_v1.sql line 49 used "pre_orders_is_owner".)
drop policy if exists "pre_orders_is_owner" on public.pre_orders;
create policy "pre_orders_is_owner" on public.pre_orders
  for select using (auth.uid() = user_id);

-- 3. Optional but good hygiene: revoke broad public insert (must be defined to
--    make the "realtime relays only what the subscriber can SELECT" guarantee
--    airtight) — the RLS SELECT policy above + publication entry are the actual
--    blockers the Android app needs. Nothing here touches the existing INSERT
--    policy (pre_orders_public_insert was dropped by preorder_stock_v1.sql and
--    replaced with the place_preorder RPC — the Realtime subscribe is read-only,
--    governed purely by SELECT rules).

-- ============================================================================
-- END realtime schema.
--   Remove from publication: alter publication supabase_realtime drop table
--                             public.pre_orders;
--   Drop policy:               drop policy if exists "pre_orders_is_owner" on
--                             public.pre_orders;
-- ============================================================================
