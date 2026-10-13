-- ============================================================================
-- TindaGo — Phase 3: Pre-order FCM push (webhook side)
-- Companion to sql/preorder_v1.sql (Phase 6 A). Idempotent; safe to re-run.
-- Applies to the shared Supabase project via the SQL editor:
--   URL: https://gncnluxjrpmbjmtzcwsv.supabase.co
--
-- MANUAL PREREQUISITES (cannot be scripted from here)
-- ────────────────────────────────────────────────────────────────────────────
-- 1. Firebase console (console.firebase.google.com):
--      a. Create a project (or reuse one) — note its Project ID.
--      b. Add an Android app with package name com.example.tindago.
--      c. Download google-services.json and place it at
--         git/app/TindaGo_APP/app/google-services.json
--      d. (Recommended) apply the google-services Gradle plugin. Until the
--         file + plugin are present the FCM service is inert and the app
--         falls back to the Phase 2 15-min poll / 45-min exact alarm.
--      e. Legacy server key (if using variant B below):
--         Project settings → Cloud Messaging → Server key (starts "AAAA...").
-- 2. Supabase SQL editor: run this whole file once (it enables pg_net).
--
-- WHAT THIS ADDS
-- ────────────────────────────────────────────────────────────────────────────
--   1. public.device_tokens        — one FCM registration token per store
--                                    owner (the Android app upserts on every
--                                    launch via register_fcm_token()).
--   2. public.register_fcm_token() — SECURITY DEFINER RPC the app calls with
--                                    its Bearer session; pins auth.uid().
--   3. notify_preorder_insert()    — AFTER INSERT trigger on pre_orders that
--                                    pushes to FCM when the owner has a
--                                    registered token.
--
-- PUSH VARIANT (pick one in section 3 — A or B, not both)
-- ────────────────────────────────────────────────────────────────────────────
--   A. FCM HTTP v1  https://fcm.googleapis.com/v1/projects/…/messages:send
--      Needs a Google OAuth2 access token (service-account JWT exchange)
--      which Postgres cannot mint without storing a private key in the DB —
--      NOT recommended for a capstone DB. Kept as commented reference.
--   B. Legacy HTTP  https://fcm.googleapis.com/fcm/send  (DEFAULT below)
--      One static server key stored as a Supabase secret. Deprecated by
--      Google but still operational for demo projects; acceptable here and
--      the ONLY variant that runs without an Edge Function.
--
-- ROLLBACK
--   drop table if exists public.device_tokens;
--   drop function if exists public.register_fcm_token(text);
--   drop function if exists public.notify_preorder_insert();
--   drop trigger if exists trg_preorder_fcm on public.pre_orders;
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. pg_net — async HTTP from Postgres (Supabase edge extension)
-- ----------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- 1. device_tokens — the store owner's current FCM registration token
--    (PK is user_id: one token per store. Re-registering overwrites.)
-- ----------------------------------------------------------------------------
create table if not exists public.device_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  fcm_token text not null,
  updated_at bigint not null default 0   -- epoch millis, matches project convention
);

alter table public.device_tokens enable row level security;

-- Owner-only: read + write own token. No anon surface, ever.
drop policy if exists "device_tokens_owner_all" on public.device_tokens;
create policy "device_tokens_owner_all" on public.device_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. register_fcm_token — called by the Android app after every successful
--    FirebaseMessaging token fetch. SECURITY DEFINER so RLS can't wedge the
--    upsert; the user_id is pinned to auth.uid(), so a caller can only ever
--    register a token for THEMSELVES. Idempotent: same row overwritten.
-- ----------------------------------------------------------------------------
create or replace function public.register_fcm_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'register_fcm_token: not authenticated';
  end if;
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'register_fcm_token: empty token';
  end if;

  insert into public.device_tokens (user_id, fcm_token, updated_at)
  values (auth.uid(), trim(p_token),
          (extract(epoch from now()) * 1000)::bigint)
  on conflict (user_id) do update
    set fcm_token = excluded.fcm_token,
        updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.register_fcm_token(text) from public;
grant execute on function public.register_fcm_token(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Trigger: a customer just placed a pre-order → push the store owner.
--    Count semantics MIRROR the app's pollAndNotify(): pending count for the
--    owner, not the raw insert row (the old plan's NEW.count was wrong — the
--    column does not exist).
-- ----------------------------------------------------------------------------
create or replace function public.notify_preorder_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_pending bigint;
  v_url text;
  v_headers jsonb;
  v_body text;
begin
  -- Only live orders: a cancelled-at-insert row should not alert anyone.
  if NEW.status is distinct from 'pending' then
    return NEW;
  end if;

  select fcm_token into v_token
  from public.device_tokens
  where user_id = NEW.user_id;

  if v_token is null then
    return NEW;  -- push channel not registered on this store yet
  end if;

  -- Same high-water count the app would notify with (see PreOrderPollWorker).
  select count(*) into v_pending
  from public.pre_orders
  where user_id = NEW.user_id and status = 'pending';

  -- ── Variant B (DEFAULT): legacy HTTP API ─────────────────────────────────
  -- Server key lives in a Supabase secret, e.g.:
  --   select vault.create_secret('AAAA...your-fcm-server-key...', 'fcm_server_key');
  v_url := 'https://fcm.googleapis.com/fcm/send';
  v_headers := jsonb_build_object(
    'Authorization', 'key=' || coalesce(
      vault.decrypt_secret((select secret from vault.decrypted_secrets
                             where name = 'fcm_server_key' limit 1)),
      ''  -- no secret configured → request below is a no-op 401, harmless
    ),
    'Content-Type', 'application/json'
  );
  v_body := jsonb_build_object(
    'to', v_token,
    'priority', 'high',
    'data', jsonb_build_object(
      'count', v_pending,
      'tempId', coalesce(NEW.temp_id, ''),
      'preorderId', NEW.id
    )
  )::text;

  -- ── Variant A (commented reference): FCM HTTP v1 ─────────────────────────
  -- Requires an OAuth2 access token minted from a service-account key;
  -- Postgres cannot sign that JWT, so this variant needs a Supabase Edge
  -- Function in front of FCM. Payload shape for that future function:
  --   {
  --     "message": {
  --       "token": "<v_token>",
  --       "data": { "count": "<v_pending>", "tempId": "<NEW.temp_id>" },
  --       "android": { "priority": "HIGH" }
  --     }
  --   }
  -- URL would be https://fcm.googleapis.com/v1/projects/<PROJECT_ID>/messages:send
  -- with header Authorization: Bearer <oauth2-token>.

  -- Async: net.http_post returns immediately; insert never waits on Google.
  perform net.http_post(
    url := v_url,
    headers := v_headers,
    body := v_body
  );

  return NEW;
end;
$$;

revoke all on function public.notify_preorder_insert() from public;
grant execute on function public.notify_preorder_insert() to postgres;

-- (Re)attach the trigger — pre_orders already exists from preorder_v1.sql.
drop trigger if exists trg_preorder_fcm on public.pre_orders;
create trigger trg_preorder_fcm
  after insert on public.pre_orders
  for each row
  execute function public.notify_preorder_insert();

-- ============================================================================
-- END Phase 3 webhook schema.
-- ============================================================================
