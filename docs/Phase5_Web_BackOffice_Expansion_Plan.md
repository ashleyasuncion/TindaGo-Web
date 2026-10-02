# Phase 5: Web Back-Office Expansion — Implementation Plan

> Reviewed against live codebase at `git/TindaGo/backoffice/` | Date: 2026-09-30 | Status: FROZEN (plan only)
> Philosophy: **Human effort ↓, System responsibility ↑** — Counter absorbs speed at the register; Back-Office absorbs managerial depth removed from the phone.
> Phase 4 sealed. Phase 3 Back-Office (login→config→db→dashboard→suppliers) complete. No code changes yet.

## Overview

**Goal:** Expand the isolated Web Back-Office (`/backoffice/` on Vercel) from 5 files to 10 for defense. Panel sees fast Android Counter (offline-first Kotlin/Compose: quick-sell, utang, day lifecycle, sync) then laptop Back-Office proves management depth exists — just not on the phone.

**Why these 6 tasks:** Highest defense impact, lowest risk, no DB migration, no server aggregation, independently reversible. Sari-sari data <10K rows → client-side fetch+compute is correct.

**What changes:** Products CRUD (5.1), Reports + CSV (5.2), Debts ledger + payments (5.3), Expenses (5.4), Restock viewer (5.5), Navigation (5.6).

**Full details split to avoid the previous scramble (Phase 4 lesson — 1 file hit the read cap):**

- [Task 5.1 — Products / Inventory](./Phase5/Task_5.1_Products_Inventory.md)
- [Task 5.2 — Reports & Analytics](./Phase5/Task_5.2_Reports_Analytics.md)
- [Task 5.3 — Debts / Utang Ledger](./Phase5/Task_5.3_Debts_Utang.md)
- [Task 5.4 — Expenses Management](./Phase5/Task_5.4_Expenses_Management.md)
- [Task 5.5 — Restock Log Viewer](./Phase5/Task_5.5_Restock_Log.md)
- [Task 5.6 — Navigation & Consistency](./Phase5/Task_5.6_Navigation_Consistency.md)
- [Execution, db.js Changelog, Rollback & Demo](./Phase5/Execution_Rollback_Demo.md)

## Constraints (non-negotiable)

1. All files in `backoffice/` — never touch 18 prototype pages, `app.js`, `style.css`.
2. Every page standalone — no shared CSS, no bundler. Each HTML copies `<style>` with `:root` 16 tokens from `dashboard.html`.
3. All data via `db.js` — no raw `sb.from()` in pages. Extend `db.js` as needed.
4. All queries `user_id` scoped — read `.eq('user_id', DB.uid())`, write `user_id: DB.uid()`, upsert `onConflict: 'user_id,id'`.
5. XSS via `esc()` for all user content (copy from `suppliers.html`).
6. Client-side compute only — fetch rows, compute KPIs/charts in JS.
7. CSV via `Blob` + `<a download>`, no server.
8. Chart.js v4 `https://cdn.jsdelivr.net/npm/chart.js@4` — destroy/recreate on reload.
9. Responsive — grids collapse <768px; tables scroll x.
10. Each page fetches own data — no shared state.

## Findings (live audit 2026-09-30)

- **Root:** `git/TindaGo/` — `backoffice/` live (5 files).
- **Inventory:** `config.js` 1316B, `db.js` 9903B (280L, 13 sites, `node -c` clean), `dashboard.html` 17464B (468L), `login.html` 8421B, `suppliers.html` 14544B (235L).
- **config.js:** `sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` (`gncnluxjrpmbjmtzcwsv`), `requireAuth()`→`login.html`, `getUserId(session)`, `signOut()`.
- **db.js:** `DB.init(session)` caches `this._uid`, `DB.uid()` throws if not inited. Methods: `getProducts()`→`upsertProduct(p)` (`onConflict: 'user_id,id'`), `getSales()`, `getDebts()`, `getPayments()`, `getDebtTransactions()`, `getExpenses()`, `getDailyEntries()`, `getEndOfDay()` (12 v2 cols), `getRestockLog()`, `getSettings()` (`maybeSingle`), `getSuppliers()`→`addSupplier()`/`deleteSupplier()` (`.eq user_id .eq id`). Missing: `deleteProduct`, `addExpense`, `addPayment` — added in Phase 5.
- **dashboard.html:** Private `:root` 16 tokens, sticky topbar, sidenav 220px, KPIs (sales/profit/debt/lowStock), Chart.js bar 7-day + doughnut top5, `paintSyncPill(sales)`. Order: `supabase CDN → config.js → db.js → chart.js → inline`.
- **suppliers.html:** Private `:root`, `esc()` helper, 6-field form (name*), 7-col table, delegated `confirm()` delete.
- **Tokens to copy verbatim:** `--primary:#16a34a --primary-dark:#15803d --primary-light:#dcfce7 --primary-bg:#f0fdf4 --danger:#dc2626 --danger-light:#fef2f2 --bg:#f8faf9 --surface:#ffffff --text:#1e293b --text-secondary:#64748b --border:#e2e8f0 --shadow:0 2px 8px rgba(0,0,0,0.08) --shadow-lg:0 8px 24px rgba(0,0,0,0.12) --radius:12px --radius-lg:16px --font:'Inter',system-ui,sans-serif`
- **Schema v2:** composite PKs `(user_id,id)`, RLS `auth.uid()=user_id`. Tables: `products`, `specific_sales`, `customer_debts`, `debt_payments`, `debt_transactions`, `expenses`, `daily_entries`, `end_of_day_data`, `restock_log`, `sms_log`, `store_settings`, `suppliers` (web-only).
- **ProductEntity** (`Models.kt:10`): `id, name, quantity, costPrice, sellingPrice, unit, lowStockThreshold=5, category, subcategory, brand, packageSize`. Status: `qty<=0 OUT_OF_STOCK else qty<=threshold LOW else PLENTY`. `ExpenseCatalog.CATEGORIES=[utilities,rent,transport,permits,labor,supplies,maintenance,other]`.
- **Isolation intact:** ZERO `<link>` to `style.css`, ZERO `localStorage sss_v3_*`, ZERO edits to prototype.

## Execution Order

```
5.1 Products (addProduct/deleteProduct) → 5.4 Expenses + 5.5 Restock (parallel, 5.5 no db.js) → 5.3 Debts (addPayment) → 5.2 Reports (needs sales+expenses) → 5.6 Navigation (touches ALL 8 pages — last)
```

After each: `node --check backoffice/db.js` + open page in browser (`npx serve` or Vercel) → Verification → `git add -A && git commit -m "feat(phase5-5.X): <name>"`. See [Execution_Rollback_Demo.md](./Phase5/Execution_Rollback_Demo.md) for checklist, changelog, rollback, 5-min demo.

## How to Use This Plan

1. Read this index, then open each Task file in order.
2. Each task: problem+defense, files (exact paths), `db.js` signatures, steps, verification, risk.
3. One task → verify → commit → next. Do NOT bundle.
4. Plan only — no code changed.

> End of index — open `Phase5/Task_5.1_Products_Inventory.md` to begin.
