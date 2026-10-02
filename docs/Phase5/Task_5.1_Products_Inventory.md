# Task 5.1 — Products / Inventory

## Problem
Counter stripped add/edit (Phase 4). Web is now catalog owner. Without this page panel asks "where do you manage products?" Highest visible CRUD demo.

## Files
- CREATE `backoffice/products.html` (~450L) — standalone, private style
- MODIFY `backoffice/db.js` — add 2 methods
- REFS `backoffice/config.js`, `dashboard.html` (:root), `suppliers.html` (esc), `data/Models.kt:10` (Product fields)

## db.js Methods

**addProduct(p)** — insert:
```js
async addProduct(p){
  const row={ user_id:this.uid(), id:p.id??Date.now(),
    name:p.name, quantity:p.quantity??0,
    cost_price:p.costPrice, selling_price:p.sellingPrice,
    unit:p.unit||'piece', low_stock_threshold:p.lowStockThreshold??5,
    category:p.category||'', subcategory:p.subcategory||'',
    brand:p.brand||'', package_size:p.packageSize||'' };
  const {data,error}=await sb.from('products').insert(row).select().single();
  if(error){console.error('addProduct:',error);return null;} return data;
}
```

**deleteProduct(id)** — scoped delete:
```js
async deleteProduct(id){
  const {error}=await sb.from('products').delete()
    .eq('user_id',this.uid()).eq('id',id);
  if(error){console.error('deleteProduct:',error);return error;} return null;
}
```
`upsertProduct(p)` already exists — edit reuses it (`onConflict:'user_id,id'`).

## Steps

### 1) Shell
Head order: `supabase@2 CDN → config.js → db.js → page script` (no chart.js). Copy `:root` 16 tokens from dashboard.html:19-36, `.topbar` sticky, `.layout flex`, `.sidenav 220px`, `.card`. Responsive `768px` collapse. Body: topbar (logo `../img/TindaGo_logo.png` + sync-pill + btnSignout) → layout → sidenav (7 links, Products active) → content (banners + form card + table card). Helpers from suppliers.html: `$, esc, peso, showError/showSuccess/clearBanners`.

### 2) db.js
Insert methods before `};`. `node --check backoffice/db.js`.

### 3) Add form
10 fields: `name*`, `costPrice*`, `sellingPrice*`, `unit` (select UNITS), `category` (select CATEGORIES), `subcategory` (depends on category), `brand`, `packageSize`, `lowStockThreshold` (default 5), `initialQuantity` (default 0). 2-col grid →1-col <768px. Submit: validate name+prices, `await DB.addProduct(p)`, reset, success, re-fetch `getProducts()` → render.

### 4) Table
Columns: Name | Category | Brand | Unit | Cost | Selling | Stock | Status (green PLENTY qty>threshold, amber LOW qty<=threshold&&>0, red OUT qty<=0) | Actions. `esc()` all strings, `peso()` prices. Row `class=low-stock` (`background:#fef3c7`) if `qty <= threshold`. Sortable headers (name/stock/price) via `Array.sort`. Search `<input>` + status `<select>` filter before render.

### 5) Edit (modal)
Click Edit → `<dialog>` pre-filled. Submit `await DB.upsertProduct(p)`, close, re-fetch.

### 6) Delete
Delegated `.btn-delete[data-id]`: `confirm()`, `await DB.deleteProduct(id)`, handle error, re-fetch. Disable btn `Deleting...` while in-flight.

### 7) Load
```js
async function main(){
  const s=await requireAuth(); if(!s) return;
  $('btnSignout').onclick=signOut; DB.init(s);
  let ps=[]; try{ps=await DB.getProducts();}catch(e){showError(e.message);renderTable([]);return;}
  renderTable(ps); // wire form/search/sort/edit/delete
}
```

## Verify
1. `node --check backoffice/db.js` clean. 2) Add product appears. 3) Search/filter works. 4) Edit persists reload. 5) Delete confirm/cancel. 6) Amber/red tints. 7) XSS name `<script>` renders escaped. 8) Different user sees no rows (RLS).

## Risk
- ID `Date.now()` scoped by user_id — no cross-store collision; avoid 0.
- Validate prices `>=0`; selling<cost warn not block.
- Add=insert (fail dup), Edit=upsert (overwrite own).
