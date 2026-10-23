-- ============================================================================
-- TindaGo — Customer self-service cancel for pre-orders (new file)
-- Requires preorder_v1.sql (and it is independent of preorder_stock_v1.sql;
-- nothing here touches stock).
--   URL   : https://gncnluxjrpmbjmtzcwsv.supabase.co
--   Action: run once in the SQL editor (idempotent; safe to re-run).
--
-- What this adds
--   cancel_preorder(p_store, p_temp_id) — SECURITY DEFINER RPC the anonymous
--   customer page calls from the receipt panel ("Cancel order" button) so a
--   customer who placed an order but changed their mind can cancel it before
--   the store fulfils it.
--
-- Why an RPC and not a direct PATCH
--   RLS gives `pre_orders` UPDATE only to the STORE OWNER (auth.uid() =
--   user_id). The customer page is anonymous, so a direct
--   sb.from('pre_orders').update() would be blocked by RLS. As with
--   place_preorder, the SECURITY DEFINER function is the only anon write path.
--
-- Security / safety
--   * Only pending or preparing orders can be cancelled — a validated /
--     fulfilled / already-cancelled order is rejected, so the store cannot have
--     a fulfilment silently reverted from the public page.
--   * The customer identifies the order by its Temp ID (the only identifier
--     the receipt reveals). The RPC also takes the store UUID and matches both
--     (user_id, temp_id) so a mis-typed ID cancels nothing.
--   * Consistency: exactly mirrors backoffice doCancel / Android
--     cancelPreOrder — sets status='cancelled', RESTORES no stock, keeps
--     payment_status. Balance change is only the logical state; stock stays
--     manual like every other cancel in the system (see preorder_stock_v1.sql
--     notes on "release claim"). If you want the claimed units released on a
--     customer cancel, that is a separate decision — say so and I'll add the
--     restore to this file.
-- ============================================================================

create or replace function public.cancel_preorder(p_store uuid, p_temp_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id          bigint;
    v_status      text;
    v_payment     text;
    v_rows        integer;
begin
    if p_store is null or p_temp_id is null or p_temp_id = '' then
        raise exception 'Missing store or Temp ID';
    end if;

    -- Lock the row so owner-side actions can't race this cancellation.
    select id, status, payment_status
      into v_id, v_status, v_payment
      from pre_orders
     where user_id = p_store and temp_id = p_temp_id
     for update;

    if v_id is null then
        raise exception 'Order not found';
    end if;

    -- Only a pending / preparing order may be cancelled by its customer.
    -- fulfilled / cancelled / ready are not reversible here.
    if v_status not in ('pending', 'preparing') then
        raise exception 'This order can no longer be cancelled';
    end if;

    update pre_orders
       set status = 'cancelled'
     where user_id = p_store and id = v_id;
    get diagnostics v_rows = row_count;

    if v_rows = 0 then
        raise exception 'Order could not be cancelled';
    end if;

    return jsonb_build_object('ok', true, 'temp_id', p_temp_id, 'status', 'cancelled', 'payment_status', v_payment);
end;
$$;

revoke all on function public.cancel_preorder(uuid, text) from public;
grant execute on function public.cancel_preorder(uuid, text) to anon, authenticated;

-- ============================================================================
-- END customer self-service cancel.
--   drop function if exists public.cancel_preorder(uuid, text);
-- ============================================================================
