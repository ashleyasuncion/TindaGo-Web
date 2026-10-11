# TindaGo Order Management — Stage-by-Stage Plan

**Status:** Approved scope (decisions recorded below) · **Mode:** staged implementation, verify each stage before the next
**Scope surfaces:** Web app (`git/TindaGo`), Android app (`git/app/TindaGo_APP`), customer site (`preorder/`)
**Database:** Supabase — `pre_orders`, `products`, `specific_sales`, `store_profiles`, RPC `get_public_products`

### Stage progress

| Stage | Status | Evidence |
|---|---|---|
| 0 Baseline | ✅ done | git status captured (web repo has prior uncommitted work; Android clean) |
| 1 Green Validate / red Cancel | ✅ verified 2026-10-10 | `showConfirmModal` variant param; only Validate passes `'success'`; `node --check` exit 0; CRLF intact; `.btn-primary` green at `style.css:946`. Manual check: pending order → green Validate / red Cancel dialogs. |
| 2 Notification tap-through | ✅ verified 2026-10-10 | `notif.onclick` → `orders.html?order=<newest tempId>`; `focusOrderFromQuery()` scrolls + flashes card (waits for async render, strips param); body text localized (`ordersNotifBody` EN/FIL). `node --check` exit 0; logic sim pass. |
| 3 Card improvements | ✅ verified 2026-10-10 | Cards show `#<last6 id>` + Temp ID; items collapsed (toggle row); "Show more (+5)" after 5 with state preserved across re-renders; i18n EN/FIL keys; CSS block after `.order-card-actions`; "View Pre-Orders" link repaired (injects `?store=<uid>`); A/B demo at `docs/orders_detail_overlay_demo.html` → **awaiting owner pick (A or B)**. |
| 4 Android deep link | ✅ verified 2026-10-10 | Query-style route `preorders?temp={temp}` (optional `temp` nav-arg, default `""`); deep-links registered DETAIL-first so `tindago://preorders?temp=X` parses before base pattern; `NotificationCenter.postPreOrderNotification(tempId=…)` + `PreOrderPollWorker` pass the newest order's Temp ID; `PreOrdersScreen` auto-scrolls (`idx+1` skips header) + 2dp green outline via `highlighted`; manifest scheme-only filter covers both URIs; `compileDebugKotlin` BUILD SUCCESSFUL. |
| 5 Customer checkout polish | ✅ verified 2026-10-10 | Added explicit cart-review step: summary-bar button ("Review order") swaps menu for review-panel (cart-items list, qty edit, note, payment, total, Place Order); single-page feel maintained. |
| 6 Consolidation & cleanup | ✅ complete 2026-10-11 | Stage 5 Android parity: `onViewPreOrders` → web inbox Intent; `PreOrderDetailOverlay` validate/cancel wired to ViewModel; `customerNote` column added (Room v15); `SyncRepository` mapping verified |


---

## Decisions recorded (from plan review)

| # | Decision point | Chosen option |
|---|---|---|
| 1 | Red "Validate" confirmation button | **Web only** — fix `showConfirmModal` button colors. Android confirm dialog is out of scope (optional follow-up). |
| 2 | Web order-details overlay (exists but unreachable) | **Decide during implementation** — build a demo file showing both variants (wired overlay vs. card-only) before choosing. |
| 3 | More than 5 orders on the web | **Compact cards, items collapsed by default, "Show more" after 5.** |

## Goals (audit-derived requirements)

1. Owner receives order notifications anywhere (web: any page open; Android: any app state) and tapping opens the specific order — including cold start from a website click/QR.
2. Order cards show **order ID, temp ID, and products**; details on card click; >5 orders handled via compact cards + Show more (web).
3. Confirmation modal: **Validate = green button, Cancel = red button** (web `orders.html` flow).
4. Customer site stays simple: browse → cart → checkout → notification → validate/cancel.
5. **Keep** the QR in `backoffice/preorder_qr.html` (QR → store's ordering page) — it works as intended.

## Key findings from the audit (Phase 1)

- **Web notification is a dead end:** `ordersNotifier.fire()` (app.js ~7483–7555) fires `new Notification(...)` with `requireInteraction` but **no `onclick`** — tapping does nothing. Body text says "tap to open" (and is hardcoded English while the title is localized).
- **Validate modal button is hardcoded red:** `showConfirmModal()` (app.js ~2811) always renders `<button class="btn btn-danger" id="confirmOkBtn">`. Shared with destructive flows (delete product, reset) that must stay red → fix must be a `variant` parameter, not a class swap. ⚠️ icon also always shown.
- **Web details overlay is dead code:** `#ordersDetailOverlay`, `openOrderDetail`/`renderOrderDetail` (app.js ~7222–7267) exist; `openOrderDetail` has **zero call sites** — cards have no click handler.
- **No pagination on web:** all pending cards render at once. Cards don't show the numeric order ID (only Temp ID) — same on Android.
- **Broken link:** `orders.html` "View Pre-Orders" button → `preorder/index.html` **without `?store=`** → customer error screen ("This order link isn't quite right").
- **Two duplicate web owner inboxes:** `orders.html` (prototype, IndexedDB + session resolve) vs `orders/` (isolated, supabase-js + native `window.confirm`). Consolidation candidate.
- **Android (for reference):** `PreOrderPollWorker` (15-min WorkManager) → `NotificationCenter` → notification deep-links `tindago://preorders` → `PreOrdersScreen`. Cold start works (manifest BROWSABLE `tindago://`), but the link opens the **list, not the specific order**; there is **no confirmation dialog** for validate/cancel (out of scope per decision #1).
- **No service worker / Push API** anywhere in the repo → web notifications only exist while a page is open. (Flagged as optional Phase B; not scheduled.)
- **Customer site (`preorder/`)** is already close to the target journey: menu with Add/stepper → Order-details panel (note + payment) → Place Order → Temp-ID receipt. Gated by `store_profiles.is_preorder_enabled`; supports `?demo=1`.

---

## Stage 0 — Baseline (no code changes)

- Record git status of both repos (`git/TindaGo`, `git/app/TindaGo_APP`).
- Manual baseline: place a test order against the store ordering page; watch it land in the `orders.html` inbox; note the current **red** Validate modal for before/after comparison.
- **Verify:** order appears as pending in web inbox; screenshots of current modal + card list saved.

## Stage 1 — Confirmation modal colors (web, `app.js`)

- Extend `showConfirmModal(message, title, okText, cancelText, variant)`:
  - `variant = 'danger'` (default) → current red `btn-danger` (cancel, delete product, reset data unchanged).
  - `variant = 'success'` → green (`btn-primary`), optional ✅ icon instead of ⚠️.
- Validate call site (app.js ~7273) passes `'success'`; Cancel call site (~7327) keeps default red.
- **Verify:** syntax check (`node --check app.js`); open `orders.html` → Validate confirm = **green**, Cancel confirm = **red**, delete-product dialog still red.

## Stage 2 — Notification tap-through (web, `app.js` notifier)

- Capture temp IDs in `fire()`; add `notif.onclick` → `window.focus(); location.href = 'orders.html?order=' + firstNewTempId`.
- Orders branch: read `?order=` after `renderOrdersInbox()` → scroll to + highlight that card.
- Localize the hardcoded notification body text (EN/FIL).
- **Verify:** grant notification permission on any page → trigger a new pending order → click notification → lands on `orders.html` with that order scrolled into view.

## Stage 3 — Card improvements (web `orders.html` + `app.js`)

- Render **order ID** (`#<pre_orders.id>`) alongside Temp ID.
- **Compact cards:** line items collapsed by default (card header click to expand).
- **"Show more" after 5 cards:** state-backed slice + re-render (button label via i18n).
- **Decision file:** create `docs/orders_detail_overlay_demo.html` (or a `?demo=overlay` flag) presenting both variants:
  - **(A)** card click opens the existing details overlay, wired to `?order=` deep link from Stage 2;
  - **(B)** overlay removed — the card itself shows everything (matches Android's inline style).
  → owner picks one; implement the choice and delete the loser.
- **Fix:** remove or repair the broken "View Pre-Orders" link (missing `?store=`).
- **Verify:** seed 6+ orders → exactly 5 shown + Show more works; cards show order ID; overlay demo loads both variants; broken link gone.

## Stage 4 — Android per-order deep link (optional parity, when approved)

- `NavGraph.kt`: extend URI pattern to `tindago://preorders?temp={tempId}` with nav argument.
- `NotificationCenter.postPreOrderNotification` puts the newest order's temp ID into the `AppLinks` intent.
- `PreOrdersScreen`: on `temp` arg → auto-scroll to + expand that card (default collapse remains for normal entry if chosen in Stage 3 parity).
- **Verify:** `adb shell am start -a android.intent.action.VIEW -d "tindago://preorders?temp=TGO-XXX"` (cold start) opens and highlights the order; normal notification still opens the list.

## Stage 5 — Customer checkout polish (`preorder/`)

- Add an explicit cart-review step (items, qty edit, note, payment method) before Place Order while keeping the single-page feel.
- Preserve demo mode, store gating, and stock-cap logic.
- **Verify:** browse → add → review → place → receipt; demo + real modes; cart totals correct; no regressions to QR entry (`?store=` + `is_preorder_enabled`).

## Stage 6 — Consolidation & cleanup

- Retire or redirect the duplicate `orders/` inbox (keep `orders.html` as *the* owner inbox — confirm before removal).
- Remove dead code decided in Stage 3; i18n sweep (notification body, Show more, new labels).
- Update `TindaGo_Web_Progress.txt` / `TindaGo_Mobile_Progress.txt`.
- **Full end-to-end run:** customer orders → web/Android notification → tap → order in view → validate (green) → `specific_sales` row + stock decrement; cancel (red) → order leaves pending list.

---

## Out of scope (flagged, not scheduled)

- Service worker / Web Push for notifications with the site closed.
- Android confirmation dialog for Validate/Cancel (decision #1 — web only).
- Faster than 15-minute Android polling.

## Files expected to change

| Stage | Files |
|---|---|
| 1–3, 6 | `git/TindaGo/app.js`, `git/TindaGo/orders.html`, `git/TindaGo/style.css` (if needed) |
| 3 | `git/TindaGo/docs/orders_detail_overlay_demo.html` (new) |
| 4 | `git/app/TindaGo_APP/.../ui/navigation/NavGraph.kt`, `data/AppLinks.kt`, `data/notifications/NotificationCenter.kt`, `ui/screens/PreOrdersScreen.kt` |
| 5 | `git/TindaGo/preorder/app.js`, `git/TindaGo/preorder/index.html` |


