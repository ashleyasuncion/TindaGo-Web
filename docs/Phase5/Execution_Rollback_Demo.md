# Phase 5 — Execution Order, db.js Changelog, Rollback & Defense Demo

## Execution Order & Dependencies

Implement sequentially. Do NOT bundle. Each task verifies alone before next.

1. **Task 5.1 Products** — independent, adds catalog CRUD. Do first (unblocks all demos).
2. **Task 5.4 Expenses + Task 5.5 Restock (parallel)** — low-risk, 5.5 needs no db.js. Do second; 5.4 adds expense CRUD needed for Reports.
3. **Task 5.3 Debts** — needs debts+payments+transactions stable, adds `addPayment`. Do third.
4. **Task 5.2 Reports** — needs sales+expenses+products stable (KPIs, margin, export). Do fourth — most complex, depends on 5.1/5.4.
5. **Task 5.6 Navigation** — touches ALL 8 pages. Do last so every new page exists.

After each task:
```
node --check backoffice/db.js
# open page in browser (npx serve or Vercel preview) → Verification steps
# smoke: login → new page → RLS check (different user sees no rows)
git add -A && git commit -m "feat(phase5-5.X): <task name>"
```
Sequence: `5.1 → verify → commit → 5.4 → 5.5 → 5.3 → 5.2 → 5.6`.

## Commit Plan (independently revertible)

- `feat(phase5-5.1): Products — addProduct/deleteProduct + products.html CRUD`
- `feat(phase5-5.4): Expenses — addExpense/deleteExpense + expenses.html`
- `feat(phase5-5.5): Restock — restock.html read-only expand`
- `feat(phase5-5.3): Debts — addPayment + debts.html detail + aging`
- `feat(phase5-5.2): Reports — reports.html KPIs charts CSV export`
- `feat(phase5-5.6): Navigation — 7-link sidenav + active + sync pill on all 8 pages`

Each `git revert <hash>` leaves `node --check backoffice/db.js` clean.

## db.js Changelog — Complete New Methods

All methods are `async`, `user_id` scoped via `this.uid()`, return `data|null` or `null|error`.

| Method | Table | Signature | Supabase Pattern |
|--------|-------|-----------|-----------------|
| addProduct | products | `addProduct(p)` | `sb.from('products').insert({user_id:uid(), id:p.id??Date.now(), name, quantity, cost_price, selling_price, unit, low_stock_threshold, category, subcategory, brand, package_size}).select().single()` |
| deleteProduct | products | `deleteProduct(id)` | `sb.from('products').delete().eq('user_id',uid()).eq('id',id)` |
| addPayment | debt_payments | `addPayment(debtId, amount, note)` | `sb.from('debt_payments').insert({user_id:uid(), debt_id:debtId, amount:Number(amount), note, timestamp:Date.now()}).select().single()` |
| addExpense | expenses | `addExpense(e)` | `sb.from('expenses').insert({user_id:uid(), id:e.id??Date.now(), date, category, amount:Number, note, timestamp}).select().single()` |
| deleteExpense | expenses | `deleteExpense(id)` | `sb.from('expenses').delete().eq('user_id',uid()).eq('id',id)` |

Optional (prefer client-side filter instead):
| getSalesByDateRange | specific_sales | `getSalesByDateRange(from,to)` | `.eq('user_id',uid()).gte('date',from).lte('date',to).order('timestamp')` |
| getExpensesByDateRange | expenses | `getExpensesByDateRange(from,to)` | same |

Conventions: `onConflict: 'user_id,id'` only for existing `upsertProduct`. New inserts use `insert`. Deletes use composite `.eq('user_id',uid()).eq('id',id)` — id-only 400s and leaks. Callers must `await DB.init(session)` first (uid() throws if skipped).

## Rollback Plan

- **If 5.1 breaks:** `git revert <5.1>` removes addProduct/deleteProduct + products.html.
- **If 5.2 breaks:** `git revert <5.2>` removes reports.html (+optional range helpers).
- **If 5.3 breaks:** `git revert <5.3>` removes addPayment + debts.html.
- **If 5.4 breaks:** `git revert <5.4>` removes addExpense/deleteExpense + expenses.html.
- **If 5.5 breaks:** `git revert <5.5>` removes restock.html only (no db.js).
- **If 5.6 breaks:** `git revert <5.6>` restores old 2-link sidenav in dashboard/suppliers.

Nuclear rollback: delete `products.html`, `reports.html`, `debts.html`, `expenses.html`, `restock.html` + revert db.js → back to Phase 3's 5 files. No migration needed. Prototype 18 pages untouched.

## File Map

- `backoffice/db.js` — 5.1 addProduct/deleteProduct, 5.3 addPayment, 5.4 addExpense/deleteExpense
- `backoffice/products.html` — 5.1 table/form/modal/search/sort
- `backoffice/reports.html` — 5.2 period KPIs, line+doughnut, top10, margin, Blob CSV
- `backoffice/debts.html` — 5.3 summary, table, detail, payment form, aging
- `backoffice/expenses.html` — 5.4 table, form, month filter, category summary
- `backoffice/restock.html` — 5.5 expandable log, itemsJson parse
- `backoffice/dashboard.html`, `suppliers.html`, +5 new — 5.6 7-link sidenav, active, sync pill, signOut
- `backoffice/login.html` — no sidenav, isolation preserved

## Defense Demo Script (5 min — the "wow" laptop moment)

> "Phase 5 moves depth from the phone to the laptop. Counter stays fast; Back-Office proves the business is managed."

1. **Phone → sync (0:00-0:45):** On Android Counter, ring up sale with utang for "Aling Nena — ₱320". Tap Sync. "Offline-first — sync pushes to Supabase bridge."

2. **Login → Dashboard (0:45-1:30):** Open laptop `backoffice/login.html`, sign in. Dashboard KPIs (Sales, Profit, Debt, Low Stock) + 7-day bar + top5 doughnut + `Live data synced · N products · N sales · signed in as ...` + sync pill. "All user_id scoped — other stores see nothing."

3. **Products (1:30-2:00):** Click Products → table with status colors + amber low-stock. Add "Sky Flakes Test — 10 × ₱8/₱10" → appears live. "Catalog lives here, not on the phone."

4. **Reports (2:00-2:45):** Click Reports → switch Today→Week→Month → KPIs + line chart animate (destroy/recreate), doughnut by category, Top 10, margin. Click Export CSV → `tindago-report-2026-09-30.csv` opens in Excel. "Client-side, no server."

5. **Debts (2:45-3:30):** Click Debts → summary (Outstanding, Active, Overdue red >30d, Largest). Click row → detail: tx history + payment history + running balance timeline. Record ₱100 payment → remaining drops. "Aging green <7, amber 7-30, red >30."

6. **Expenses (3:30-4:00):** Click Expenses → add ₱500 Rent today → doughnut updates, month filter switches. "Operating expenses, not COGS — Net Profit is real."

7. **Restock (4:00-4:30):** Click Restock → expand run → line items `PurchaseEntry productName costPerUnit qtyAdded totalCost` from `itemsJson`, spend this month. "Read-only warehouse activity."

8. **Navigation close (4:30-5:00):** Click all 7 sidenav links → active highlight moves, sync pill stays, Sign Out from any page → login. "8 pages, one portal, independently reversible. And we never touched the 18 prototype pages."

