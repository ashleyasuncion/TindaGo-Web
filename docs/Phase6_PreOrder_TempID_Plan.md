# Phase 6: Digital Customer Pre-Ordering / Temp ID — Implementation Plan

> Reviewed against live codebase at `git/TindaGo/` + `git/app/TindaGo_APP/` | Date: 2026-10-08 | Status: FROZEN (plan only)
> Goal: add an *optional* digital pre-ordering workflow that lets a customer place an order before arriving at the store, reducing waiting time — one of the biggest frictions in a sari-sari store transaction.

---

## 1. The Concept in One Diagram

```
  CUSTOMER (web browser, own phone)            SUPABASE CLOUD             STORE OWNER (Android app)
  ──────────────────────────────               ───────────────            ─────────────────────────
  1. Scans store QR  ──► preorder/?store=<uid> ──► loads store_profiles
  2. Selects products (public RPC view)
  3. Picks payment method (Cash / GCash / Maya)
  4. Submits order  ──► INSERT pre_orders      ──► poll worker fetches
  5. Receives TEMP ID  ──────────►   (row: temp_id, items_json, payment, status)
                                                    │
                                                    ▼
                                       Android posts LOCAL notification
                                       ("New pre-order TGO-7A2K9 — ₱145.00")
                                                    │
                                   ──────────────────▼──────────────────
                                   Owner opens Pre-Orders (tindago://preorders)
                                   ├─ sees items/qty/payment/timestamp
                                   ├─ prepares order
                                   └─ VALIDATE Temp ID → converts to specific_sales
                                        (one transactionId, decrements stock)
                                        optionally marks payment_status = paid
```

The communication is conceptually **one-way from the customer's perspective** (Web → Store), as the concept requires. The store's application consumes the synchronized order information. Supabase is the shared synchronization layer — which is precisely the currently-deployed architecture.

---

## 2. Current-State Audit (what already exists, 2026-10-08)

### 2.1 Repositories
- **Web prototype** (`git/TindaGo/`): 18 vanilla HTML pages, `app.js`, offline-first IndexedDB (`db_indexed.js`) with a phone-frame simulator. RULES (from `docs/Phase3` + `Phase5`): the prototype pages, `app.js`, `style.css` are **never touched** — new surfaces go in *isolated* subfolders (`backoffice/` is the precedent).
- **Back-Office** (`git/TindaGo/backoffice/`): isolated portal on Vercel. `config.js`, `db.js` (user-scoped), pages: login, dashboard, products, reports, debts, expenses, restock, suppliers.
- **Android** (`git/app/TindaGo_APP/`): Kotlin + Compose + Room v13, offline-first. `data/sync/SyncRepository.kt` (push sync), `data/notifications/NotificationCenter.kt` (local notifications + `tindago://` deep links), `data/notifications/DailyCheckWorker.kt` (WorkManager — the "how to poll" precedent), `ui/screens/AppViewModel.kt` (`completeSale()` — the "how to fulfill" precedent).

### 2.2 Shared Supabase Project
- URL `https://gncnluxjrpmbjmtzcwsv.supabase.co` — wired in web `supabase.js`, `backoffice/config.js`, Android `SupabaseConfig.kt` (shared anon key).
- **Schema v2** (`supabase_v2.sql`): 10 tables, every row carries `user_id = auth.uid()`, composite PK `(user_id, id)` / `(user_id, date)`, RLS `auth.uid() = user_id`. (`store_settings` + `suppliers` are web-only, not in the `.sql` file.)
- **Auth:** password grant (`POST /auth/v1/token?grant_type=password`). Users are created by the developer/admin in the Dashboard — no public sign-up. That's the "Store-Owned Authentication" gap.

### 2.3 Key gaps identified (verified in code)
1. **No `pre_orders` table.** Nothing named order exists (confirmed via search).
2. **Push-only sync on Android.** `SyncRepository.kt` only upserts up; it cannot pull. Pre-orders require a **pull** path (new).
3. **RLS blocks anonymous reads** — `products` is `auth.uid()=user_id`, so an anonymous customer **cannot** read a store's products. This is the single biggest obstacle; solved with a **narrow public projection** (SECURITY DEFINER RPC), NOT by opening table reads (which leak `cost_price`).
4. **No store-identity-in-URL concept.** The QR must encode the store's `user_id`.
5. **No pull-foreground notification channel.** `NotificationChannels` has 5 channels; pre-orders need a dedicated channel or reuse the default.
6. **`completeSale()` sets `customerName` only for credit sales** — pre-orders are identified by Temp ID which the existing model has no field for. The conversion step must bridge Temp ID → `SpecificSale` cleanly (e.g. `description` field).



---

## 3. Constraints (non-negotiable — carried from Phases 3/5)

1. Never touch the prototype pages, `app.js`, `style.css` — all new UI in an isolated folder (`preorder/`) or in `backoffice/`.
2. Every new table carries `user_id = auth.uid()` + composite PK — keep the multi-tenant convention.
3. `cost_price` must never be exposed to anonymous customers. Public reads go through a narrowed RPC only.
4. `pre_orders` RLS: anonymous users may INSERT (order), only the store owner may SELECT/UPDATE. No "read everyone's orders".
5. Temp ID is the customer's reference — shown clearly one time, echoed in the notification, and searchable by the store.
6. Offline-first on Android: incoming pre-orders cached locally (Room) so the store still sees them without connectivity.
7. Each phase: implement → verify → commit (`feat(phase6-N): <name>`). Do NOT bundle phases.
---

## 4. Proposed Database Design (new `sql/preorder_v1.sql`)

### 4.1 `pre_orders` table

```sql
create table if not exists public.pre_orders (
  id bigint not null,                -- per-user auto (like other tables)
  user_id uuid not null references auth.users(id) on delete cascade, -- store owner uid
  temp_id text not null default '',  -- human-friendly, e.g. "TGO-7A2K9"
  items_json text not null default '[]',  -- mirror restock_log.items_json
  total_amount double precision not null default 0,
  payment_method text not null default 'cash',  -- cash | gcash | maya (intent only)
  payment_status text not null default 'unpaid', -- unpaid | paid
  status text not null default 'pending',  -- pending → preparing → ready → fulfilled | cancelled
  customer_note text not null default '',
  created_at bigint not null default 0,
  expires_at bigint not null default 0,   -- optional auto-expire
  primary key (user_id, id)
);
alter table public.pre_orders enable row level security;

-- anonymous customers can place an order
drop policy if exists "pre_orders_public_insert" on public.pre_orders;
create policy "pre_orders_public_insert" on public.pre_orders
  for insert to anon, authenticated with check (true);

-- only the store owner sees/updates their orders
drop policy if exists "pre_orders_is_owner" on public.pre_orders;
create policy "pre_orders_is_owner" on public.pre_orders
  for select using (auth.uid() = user_id);
drop policy if exists "pre_orders_owner_update" on public.pre_orders;
create policy "pre_orders_owner_update" on public.pre_orders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> **RLS safety note (constraint #4):** the insert policy is the ONLY anonymous-write surface in the whole project. It lets anyone create rows for *any* `user_id`. That's acceptable for an anonymous public pre-order form, but it is the one deliberate exception and is documented as such. No SELECT is open — a customer can never read orders (theirs or anyone else's). Temp ID is the lookup key the store uses (owner-scoped SELECT).

### 4.2 `store_profiles` table (public store identity)

```sql
create table if not exists public.store_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null default '',
  owner_name text not null default '',
  address text not null default '',
  phone_display text not null default '',  -- show-only; do NOT store raw number if avoidable
  is_preorder_enabled boolean not null default false,
  updated_at bigint not null default 0
);
alter table public.store_profiles enable row level security;
-- anyone may read (needed for the public landing page)
drop policy if exists "store_profiles_public_select" on public.store_profiles;
create policy "store_profiles_public_select" on public.store_profiles
  for select using (true);
-- only the owner writes
drop policy if exists "store_profiles_owner_all" on public.store_profiles;
create policy "store_profiles_owner_all" on public.store_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- private columns stay filterable with a select(...) projection in code anyway
```


### 4.3 Public products RPC (narrow projection, never leaks cost)

```sql
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
```

> **Why SECURITY DEFINER** — it bypasses RLS for this *narrow, read-only* projection only. Fields returned are exactly what the customer page needs. `cost_price`, `low_stock_threshold`, `barcode`, and internals are never returned.

### 4.4 Indexes

```sql
create index if not exists pre_orders_owner_status_idx
  on public.pre_orders (user_id, status, created_at desc);
create index if not exists pre_orders_temp_id_idx on public.pre_orders (temp_id);
```

### 4.5 (Optional) `pre_order_items` normalized table — only if aggregate reporting on items is needed later.

Default: use `items_json` (consistent with `restock_log`).

---

## 5. Phased Implementation

### Phase A — Backend/API (Supabase SQL)
- Create `sql/preorder_v1.sql` (above) — apply via Supabase SQL editor.
- Files: new only. No edits to `supabase_v2.sql`.
- **Verify:** SQL editor passes; policies listed; RPC callable.

### Phase B — Customer-facing web page (isolated `preorder/`)
- New folder `git/TindaGo/preorder/` with `index.html` + `app.js` + `config.js` (vanilla, mirror `backoffice/` style, zero-build).
- Flow: parse `?store=<uid>`, load store profile + public products (RPC), cart, payment choice, submit → INSERT → **show Temp ID receipt screen** with copy option.
- **Verify:** submit order in browser → row appears in Supabase; Temp ID shows.

### Phase C — Store QR code UI
- Add a **Pre-Order Settings / QR** surface. Two candidate placements:
  - (A) Back-Office new page `backoffice/preorder_qr.html` — prints/downloads QR encoding `https://<host>/preorder/?store=<user_id>`; writes `store_profiles` (name, enable flag).
  - (B) Android Settings screen — QR generated in-app with a lightweight lib.
- Recommend **A** (keeps APK lean; QR → download/print). QR generation client-side (qrcode lib) or static generator.
- **Verify:** QR decodes to correct URL; landing page loads that store's products.

### Phase D — Android: intake, notification, Temp-ID screens (the big one)
- **D1:** Room `PreOrderEntity` + `PreOrderDao` + `AppDatabase` migration 13→14 + export/import bump. ✅ DONE
- **D2:** `SupabaseClient.fetchPreOrders(token)` — the project's first pull endpoint. ✅ DONE
- **D3:** `PreOrderPollWorker` (WorkManager, mirrors `DailyCheckWorker`): every 3–5 min fetch pending orders, cache into Room, `NotificationCenter.post(...)`, new channel "Pre-Orders". ✅ DONE
- **D4:** `NotificationDeepLinks.PREORDERS = "tindago://preorders"` + NavGraph deeplink + `PreOrdersScreen` (list + expand + VALIDATE). ✅ DONE
- **D5:** `AppViewModel.validatePreOrder(tempId)` — reuse `completeSale()` mechanics: one transactionId, decrement stock through existing cart logic, mark row `status=fulfilled` + `payment_status=paid` (if cash settled on the spot). ✅ DONE
- **D6:** `PreOrderLookupScreen` — type Temp ID to fetch order (for customer showing screenshot). ✅ DONE
- **Verify:** full loop (Section 8). ✅ Android compiles (BUILD SUCCESSFUL); end-to-end still needs a live device + Supabase row (manual acceptance test).

> **Status (final): D1–D6 COMPLETE at 2026-10-09.** This closes Phase D. Remaining polish is out of scope (see Section 9 open questions).

### Phase E — Store-owned auth & employees (DEFERRED — design only)
Documented but not implemented in this cycle. Separate design note to follow.

---

## 6. File Map (new/changed)
| Phase | File | Action | Notes |
|---|---|---|---|
| A | `git/TindaGo/sql/preorder_v1.sql` | NEW | |
| B | `git/TindaGo/preorder/index.html` | NEW | |
| B | `git/TindaGo/preorder/app.js` | NEW | |
| B | `git/TindaGo/preorder/config.js` | NEW | |
| C | `git/TindaGo/backoffice/preorder_qr.html` | NEW | |
| D1 | `...data/local/PreOrderEntity.kt` | NEW | |
| D1 | `...data/local/PreOrderDao.kt` | NEW | |
| D1 | `...data/local/AppDatabase.kt` | EDIT | migration 13→14 |
| D2 | `...data/sync/SupabaseClient.kt` | EDIT | add fetch |
| D3 | `...data/notifications/PreOrderPollWorker.kt` | NEW | |
| D3 | `...data/notifications/NotificationCenter.kt` | EDIT | channel + post |
| D4 | `...ui/navigation/Routes.kt` | EDIT | PREORDERS route + deep link |
| D4 | `...ui/screens/PreOrdersScreen.kt` | NEW | |
| D4 | `...ui/screens/AppViewModel.kt` | EDIT | expose order state |
| D5 | `...ui/screens/AppViewModel.kt` | EDIT | `validatePreOrder()` |
| D5 | `...data/sync/PreOrderFulfillment.kt` | NEW | or reuse SaleFulfillment |
| D6 | `...ui/screens/PreOrderLookupScreen.kt` | NEW | |
| D6 | `...ui/navigation/NavGraph.kt` | EDIT | deeplink target |

(All `...` paths are `git/app/TindaGo_APP/app/src/main/java/com/example/tindago/`.)

---

## 7. Rollback / Reversibility

- **Phase A (SQL):** fully reversible (`drop table if exists public.pre_orders`, `store_profiles`, `drop function get_public_products`). No change to existing tables.
- **Phase B / C (web):** isolated new files — delete the `preorder/` and `preorder_qr.html` folders/files. Nothing touched in the 18 prototype pages.
- **Phase D (Android):** Room migration is additive (v13 → v14, new table only). If rolled back, downgrade is NOT supported by Room; restore the previous APK from the commit prior to `feat(phase6-D...)`, or keep the migration and just stop launching the poll worker (no data loss). Export/import versioned the same way as existing tables.
- Guardrail: every phase commit is independent and reversible; do not bundle.

---

## 8. End-to-End Verification (manual acceptance test)

1. Supabase SQL editor: run `sql/preorder_v1.sql`; confirm `pre_orders`, `store_profiles`, RPC exist.
2. Back-Office: open `preorder_qr.html`, set `store_profiles.store_name` + enable, generate QR.
3. Scan QR with a test phone → lands on `https://<host>/preorder/?store=<uid>`.
4. Customer page shows store name + public products (no cost prices visible); add 2+ items; pick payment method; submit.
5. Temp ID receipt appears (e.g. `TGO-7A2K9`); row visible in Supabase table viewer with `status=pending`.
6. Android (signed in as same `user_id`): within poll interval a "Pre-Orders" notification appears; tapping opens `PreOrdersScreen` listing the order (temp_id, items, qty, payment, timestamp).
7. Owner taps **VALIDATE** → order converts to `specific_sales` (one transactionId, paymentMethod), stock decrements, row becomes `status=fulfilled`.
8. Optional: `PreOrderLookupScreen` — type `TGO-7A2K9` → order found (screenshot path).
9. Negative case: anonymous user cannot SELECT any `pre_orders` / cannot read `cost_price`.

---

## 9. Open Questions / Decisions Needed (before coding Phase B onward)

1. **Real-time vs. polling on Android** — this plan chooses **polling** (WorkManager, matches repo, no FCM infra). If instant arrival matters and infra budget allows, revisit a Supabase Realtime subscription. Decision is open but the plan defaults to polling.
2. **QR placement** — Back-Office page (recommended) vs. Android Settings screen. Both are viable; Android keeps ownership in-app but adds a QR lib to the APK.
3. **Temp ID format** — proposed `TGO-` + 5 chars from a non-ambiguous alphabet (no `0/O`, `1/I/L`). Locked unless you prefer digits only.
4. **Auto-expiry** — optional `expires_at` (default 24h) or manual cancel only. Recommend manual cancel + optional expiry later.
5. **e-wallet capture** — out of scope (documented). Customer selects intent only. Confirmed unless you want to add a real gateway (not recommended for capstone).

---

## 10. Commit Sequence

Follow repo convention `feat(phase6-N): <name>` — one commit per phase:

- `feat(phase6-A): supabase pre_order schema + public product RPC`
- `feat(phase6-B): customer pre-order web page (isolated preorder/)`
- `feat(phase6-C): store QR code settings (backoffice)`
- `feat(phase6-D1): room pre_order entity/dao + migration v14`
- `feat(phase6-D2): supabase fetchPreOrders pull endpoint`
- `feat(phase6-D3): pre-order poll worker + notification channel`
- `feat(phase6-D4): pre-orders screen + deep link + nav`
- `feat(phase6-D5): temp-id validation -> specific_sales`
- `feat(phase6-D6): temp-id lookup screen`

Phase E (store-owned auth & employees) deferred — separate design note.


