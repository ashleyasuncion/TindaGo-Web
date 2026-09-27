# Phase 3: Back-Office Web Portal — Implementation Plan

> Target directory: `git/TindaGo/backoffice/`  
> Date: 2026-09-27  
> Architecture: Isolated static web portal consuming Supabase cloud data (Schema v2, multi-tenant).  
> Status: APPROVED PLAN — ready for execution.  \
> Task numbering: Phase 3 tasks are numbered **8–12** (continuing the global
> sequence after Phase 2 Tasks 1–7) to avoid confusion with the Android
> Phase 2 task numbers. Renumbered 2026-09-27.

---

## 1. Architectural Strategy & Directory Structure

The back-office portal lives in an isolated `backoffice/` subfolder inside the web repository (`git/TindaGo/`).
**Critical Rule:** It does NOT touch, modify, or inject scripts into any of the 18 existing prototype HTML files (`index.html`, `inventory.html`, etc.), `app.js`, `style.css`, or the phone-frame simulator.

```text
git/TindaGo/
├── index.html              <-- existing phone simulator (100% untouched)
├── checkout.html           <-- existing (untouched)
├── inventory.html          <-- existing (untouched)
├── app.js                  <-- existing (untouched)
├── style.css               <-- existing (untouched)
├── download.html           <-- existing APK download (untouched)
├── ...                     <-- all other existing pages (untouched)
│
└── backoffice/             <-- NEW, ISOLATED BACK-OFFICE
    ├── config.js           <-- Supabase client initialization & session auth helpers
    ├── db.js               <-- User-scoped query layer (Schema v2, composite PKs)
    ├── login.html          <-- Back-office login page
    ├── dashboard.html      <-- Main analytics dashboard (KPIs, Chart.js 7-day sales & top products)
    └── suppliers.html      <-- Web-only supplier management (two-tier proof)
```

### Vercel Deployment Routing
- `yourdomain.com/` -> Existing mobile prototype simulation (offline/localStorage).
- `yourdomain.com/download.html` -> Mobile APK download page.
- `yourdomain.com/backoffice/login.html` -> Back-office web portal login.
- `yourdomain.com/backoffice/dashboard.html` -> Back-office store analytics.
- `yourdomain.com/backoffice/suppliers.html` -> Back-office supplier management.

---

## 2. Tasks & Detailed Code Specifications

### TASK 8: Back-Office Config & Auth Helpers
**File:** `git/TindaGo/backoffice/config.js`
- Connects to Supabase using CDN client (`window.supabase.createClient`).
- Pre-wires real project credentials:
  - `SUPABASE_URL = "https://gncnluxjrpmbjmtzcwsv.supabase.co"`
  - `SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduY25sdXhqcnBtYmptdHpjd3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTcwODAsImV4cCI6MjEwNTk5MzA4MH0.Ynto-Kz-CdIrE9jqJT2s-PJtiGFIYzr4Qg9hC16_Ris"`
- Exports `requireAuth()` (redirects unauthenticated users to `login.html`), `getUserId(session)`, and `signOut()`.

---

### TASK 9: Back-Office Sign-In Page
**File:** `git/TindaGo/backoffice/login.html`
- Standalone responsive desktop/mobile sign-in card.
- Validates credentials via `sb.auth.signInWithPassword({ email, password })`.
- If already logged in, automatically redirects to `dashboard.html`.
- Displays real-time error banner on authentication failures.

---

### TASK 10: Data Layer (Schema v2, User-Scoped)
**File:** `git/TindaGo/backoffice/db.js`
- Replaces localStorage with asynchronous Supabase PostgREST queries.
- Initialized per-page via `DB.init(session)` to capture the authenticated `user_id`.
- **Schema v2 Strict Adherence:**
  - `getProducts()`, `getSales()`, `getDebts()`, `getPayments()`, `getDebtTransactions()`, `getExpenses()`, `getEndOfDay()`, `getRestockLog()`, `getSuppliers()` strictly filter `.eq('user_id', this.uid())`.
  - `getSettings()` queries `.eq('user_id', this.uid()).maybeSingle()` (matching Schema v2 `user_id PRIMARY KEY`).
  - `upsertProduct()` upserts with `user_id` on conflict `user_id,id`.
  - `addSupplier()` injects `user_id: this.uid()`.
  - `deleteSupplier(id)` enforces `.eq('user_id', this.uid()).eq('id', id)`.
  - Complete `getEndOfDay()` mapping includes all columns (`stockCheckDone`, `debtPaymentsDone`, `salesDiff`, `netProfit`).

---

### TASK 11: Store Analytics Dashboard
**File:** `git/TindaGo/backoffice/dashboard.html`
- **KPI Metrics Cards:** Total Sales (₱), Total Estimated Profit (₱), Outstanding Debt (₱), Low Stock Alert count.
- **Visual Analytics:**
  - 7-Day Sales Volume bar chart using Chart.js.
  - Top 5 Products by Quantity sold (doughnut chart).
- **Sync Status Pill:** Displays last synced timestamp ("Synced Xm ago").
- Navigation bar links strictly to back-office pages (`Dashboard`, `Suppliers`).

---

### TASK 12: Supplier Management (Two-Tier Architecture Proof)
**File:** `git/TindaGo/backoffice/suppliers.html`
- Web-exclusive feature (does not exist in the mobile app, illustrating the complementary back-office tier).
- Allows store owners to add, view, and delete supplier contacts.
- Includes `esc(str)` security helper to prevent XSS injection in dynamic HTML table rows.

---

## 3. Defense Demonstration Flow

1. **Step 1 (Counter Terminal):** Ring up a sale on the mobile app offline. Show that the mobile app operates completely without internet.
2. **Step 2 (Cloud Sync):** Connect phone to internet -> tap "Sync Now" in Settings. Show "Synced N tables successfully".
3. **Step 3 (Back-Office Access):** Open browser on laptop/tablet -> navigate to `/backoffice/login.html` -> sign in as `tindago@test.com`.
4. **Step 4 (Live Analytics):** Dashboard displays the freshly synced sales, updated profits, and current stock count in real-time.
5. **Step 5 (Advanced Management):** Navigate to Suppliers page -> add supplier details. Emphasize that desktop back-office handles management tasks while counter mobile app stays ultra-simple and focused.
