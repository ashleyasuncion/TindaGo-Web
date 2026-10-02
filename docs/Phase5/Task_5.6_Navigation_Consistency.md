# Task 5.6 — Navigation & Cross-Page Consistency

## Problem
8 pages (login + dashboard + suppliers + 5 new) must feel like one portal. Without consistent nav, panel sees 8 separate demos. This task is last because it touches every file.

## Files to Modify (exact paths — ALL back-office pages)
- `backoffice/login.html` — **no sidenav** (standalone) — only ensure Sign Out not needed
- `backoffice/dashboard.html` — update sidenav to 7 links, active=Dashboard, add paintSyncPill to every page pattern
- `backoffice/suppliers.html` — same sidenav update, active=Suppliers
- `backoffice/products.html` — active=Products
- `backoffice/reports.html` — active=Reports
- `backoffice/debts.html` — active=Debts
- `backoffice/expenses.html` — active=Expenses
- `backoffice/restock.html` — active=Restock

## Steps

### 1) Define NAV_LINKS (single source)
```js
const NAV = [
  {href:'dashboard.html', label:'Dashboard'},
  {href:'products.html',  label:'Products'},
  {href:'reports.html',   label:'Reports'},
  {href:'debts.html',     label:'Debts'},
  {href:'expenses.html',  label:'Expenses'},
  {href:'restock.html',   label:'Restock'},
  {href:'suppliers.html', label:'Suppliers'},
];
```

### 2) Sidenav template (copy into each HTML's .sidenav)
```html
<nav class="sidenav">
  <!-- generate from NAV array or hardcode for no-JS fallback -->
  <a href="dashboard.html">Dashboard</a>
  <a href="products.html">Products</a>
  <a href="reports.html">Reports</a>
  <a href="debts.html">Debts</a>
  <a href="expenses.html">Expenses</a>
  <a href="restock.html">Restock</a>
  <a href="suppliers.html">Suppliers</a>
</nav>
```
Style: `.sidenav a.active{background:var(--primary-light); color:var(--primary-dark);}` (same as dashboard.html:29). Active set via JS:
```js
document.querySelectorAll('.sidenav a').forEach(a=>{
  if(a.getAttribute('href')===location.pathname.split('/').pop()) a.classList.add('active');
});
```

### 3) Topbar consistency
Every page topbar: brand link (`../img/TindaGo_logo.png` + "TindaGo Back Office") left, right side `sync-pill#syncPill` + `btn-signout#btnSignout`. Copy dashboard.html topbar HTML+CSS verbatim. Reuse `paintSyncPill(salesOrProducts)` logic:
```js
function paintSyncPill(rows){
  const pill=$('syncPill'); if(!pill) return;
  if(!rows || !rows.length){ pill.textContent='No data yet'; pill.className='sync-pill nodata'; return; }
  // find most recent timestamp/date
  const latest=rows[0]?.timestamp||rows[0]?.date||Date.now();
  pill.textContent='Last synced: '+ new Date(latest).toLocaleString();
  pill.className='sync-pill';
}
```
Sign Out: `$('btnSignout').addEventListener('click', signOut);` on every page (signOut from config.js).

### 4) Apply to each file
- Open each HTML, replace existing sidenav (dashboard currently 2 links, suppliers 2 links) with 7-link version.
- Set active class per page (hardcode active or use JS above — do both for robustness).
- Ensure topbar has syncPill + btnSignout with correct IDs.
- Ensure `<script>` order still `supabase CDN → config.js → db.js → chart.js(if needed) → page script` after edits.

### 5) Responsive check
Sidenav collapses to horizontal or stacked <768px (reuse dashboard media queries). Tables keep `overflow-x:auto`.

## Verify
1. Login → dashboard → sidenav shows 7 links, Dashboard active (indigo). 
2. Click Products → Products active, others not. Repeat for all 7.
3. Sync pill shows same time across pages (or page-specific count). 
4. Sign Out on each page → redirects to login.html, session cleared.
5. `npx serve` + navigate all pages → no 404, relative hrefs resolve (test both `backoffice/` and Vercel `/backoffice/`).
6. No duplicate `id="btnSignout"` or `id="syncPill"` per page.

## Risk
- Relative hrefs: use `href="dashboard.html"` not `"/backoffice/dashboard.html"` so local file serve works; Vercel rewrite handles both.
- Active state: `location.pathname.split('/').pop()` fails if URL has query `?` — strip `split('?')[0]`.
- Topbar gradient spec says `linear-gradient(135deg,#4f46e5,#7c3aed)` but live dashboard uses green `#16a34a` theme — **keep green** to match audited tokens; note divergence in plan so panel doesn't see theme jump.
