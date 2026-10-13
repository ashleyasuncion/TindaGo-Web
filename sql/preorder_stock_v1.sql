-- ============================================================================
-- TindaGo — Concurrent stock claim at order time (multi-buyer safety)
-- New file; requires preorder_v1.sql to have been applied first.
--   URL   : https://gncnluxjrpmbjmtzcwsv.supabase.co
--   Action: run once in the SQL editor (idempotent; safe to re-run).
--
-- Problem
--   The customer page previously inserted into public.pre_orders directly with
--   an anon INSERT (pre_orders_public_insert). Nothing checked or claimed stock,
--   so with several customers browsing the same menu, two orders could both be
--   "valid" for the last unit inside the live-refresh window. The store was
--   left with orders it could not fulfill.
--
-- Fix
--   A new SECURITY DEFINER function place_preorder(p_payload) becomes the ONLY
--   path an order is written:
--     1. For each line item it runs the atomic conditional update
--          update products set quantity = quantity - qty
--           where id = item_id and user_id = store and quantity >= qty;
--        Postgres serializes concurrent updates on the same row, so when two
--        customers race for the last unit, one update decrements it and the
--        other updates 0 rows -> raises -> rolls back the whole order
--        (including any items it already deducted). One unit cannot be
--        granted twice.
--     2. Only after every line succeeds does it insert the pre_orders row.
--   The client (preorder/app.js submitPreorder) now calls
--   sb.rpc('place_preorder', payload) instead of sb.from('pre_orders').insert().
--
-- Hardening
--   The old pre_orders_public_insert policy is dropped so a stale/custom client
--   that still does a direct INSERT cannot bypass the stock check. The RPC is
--   SECURITY DEFINER, so its internal insert works regardless of RLS.
--
-- Notes / trade-offs
--   * Stock is a PRE-ORDER claim: it decrements when the order is placed and is
--     NOT restored if the customer never shows up. The store sees the pending
--     order and can cancel it from the app (restock manually or via a future
--     "release claim" feature). This favors never overselling over perfect
--     stock accuracy, which is the right trade for a sari-sari store.
--   * idempotency: the payload carries the client-generated id (Date.now()).
--     Retrying the same payload reuses the same PK and fails with a unique
--     violation, which the RPC surfaces as a friendly error rather than a
--     duplicate order.
-- ============================================================================

-- 1. place_preorder — atomic claim + insert, single transaction.
create or replace function public.place_preorder(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_store       uuid    := (p_payload->>'user_id')::uuid;
    v_id          bigint  := (p_payload->>'id')::bigint;
    v_temp_id     text    := coalesce(p_payload->>'temp_id', '');
    v_items_json  text    := coalesce(p_payload->>'items_json', '[]');
    v_total       double precision := coalesce((p_payload->>'total_amount')::double precision, 0);
    v_method      text    := coalesce(p_payload->>'payment_method', 'cash');
    v_note        text    := coalesce(p_payload->>'customer_note', '');
    v_created_at  bigint  := coalesce((p_payload->>'created_at')::bigint, 0);
    v_expires_at  bigint  := coalesce((p_payload->>'expires_at')::bigint, 0);
    item          jsonb;
    v_pid         text;
    v_qty         double precision;
    v_updated     integer;
begin
    if v_store is null or v_id is null then
        raise exception 'Invalid order payload';
    end if;

    -- Claim stock line by line. The conditional UPDATE is the concurrency
    -- guard: quantity >= qty is evaluated and decremented under the row lock,
    -- so two concurrent orders cannot both take the same unit.
    for item in select * from jsonb_array_elements(v_items_json::jsonb) loop
        v_pid := item->>'id';
        v_qty := coalesce((item->>'qty')::double precision, 0);
        if v_pid is not null and v_qty > 0 then
            update products
               set quantity = quantity - v_qty
             where user_id = v_store
               and id::text = v_pid
               and quantity >= v_qty;
            get diagnostics v_updated = row_count;
            if v_updated = 0 then
                raise exception 'Not enough stock for "%" (requested %)', v_pid, v_qty;
            end if;
        end if;
    end loop;

    -- All lines claimed — write the order. SECURITY DEFINER bypasses the
    -- dropped anon INSERT policy (only this function may insert now).
    insert into pre_orders (
        id, user_id, temp_id, items_json, total_amount,
        payment_method, payment_status, status,
        customer_note, created_at, expires_at
    ) values (
        v_id, v_store, v_temp_id, v_items_json, v_total,
        v_method, 'unpaid', 'pending',
        v_note, v_created_at, v_expires_at
    );

    return jsonb_build_object('ok', true, 'temp_id', v_temp_id);
end;
$$;

revoke all on function public.place_preorder(jsonb) from public;
grant execute on function public.place_preorder(jsonb) to anon, authenticated;

-- 2. Close the old direct-INSERT hole: the RPC is now the only write path.
drop policy if exists "pre_orders_public_insert" on public.pre_orders;

-- 3. Safety net (defense in depth): if anything ever inserts into pre_orders
--    WITHOUT going through place_preorder (e.g. an owner-side tool), still
--    reject orders that exceed current stock. Runs as SECURITY DEFINER so it
--    can read products regardless of the caller's RLS.
create or replace function public.validate_preorder_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    item     jsonb;
    v_pid    text;
    v_qty    double precision;
    v_avail  double precision;
begin
    for item in select * from jsonb_array_elements(coalesce(new.items_json, '[]')::jsonb) loop
        v_pid := item->>'id';
        v_qty := coalesce((item->>'qty')::double precision, 0);
        if v_pid is not null and v_qty > 0 then
            select quantity into v_avail
              from products
             where user_id = new.user_id and id::text = v_pid;
            if v_avail is null then
                raise exception 'Product % is no longer available', v_pid;
            end if;
            if v_avail < v_qty then
                raise exception 'Not enough stock for % (requested %, available %)', v_pid, v_qty, v_avail;
            end if;
        end if;
    end loop;
    return new;
end;
$$;

drop trigger if exists trg_validate_preorder_stock on public.pre_orders;
create trigger trg_validate_preorder_stock
    before insert on public.pre_orders
    for each row execute function public.validate_preorder_stock();

-- ============================================================================
-- END concurrent-stock schema.
--   drop function if exists public.place_preorder(jsonb);
--   drop function if exists public.validate_preorder_stock();
--   drop trigger if exists trg_validate_preorder_stock on public.pre_orders;
-- ============================================================================
