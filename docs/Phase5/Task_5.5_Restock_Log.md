# Task 5.5 — Restock Log Viewer (Read-Only)

## Problem
Restock runs are warehouse activity captured on mobile. Web needs read-only spend visibility for defense — no editing, just proof that bulk buying + stock corrections are tracked and costed. Quick win, lowest risk.

## Files
- CREATE `backoffice/restock.html` (~350L) — standalone, no chart.js
- MODIFY `backoffice/db.js` — **none** (`getRestockLog()` already exists: `.from('restock_log').eq('user_id',uid).order('date desc')`)

## Data Shape
`getRestockLog()` returns rows with `date`, `totalCost`/`total_cost`, `itemCount` or `items` JSON, plus `itemsJson` string array of `PurchaseEntry {productName, costPerUnit, qtyAdded, totalCost}` (from `Models.kt:205`). Mobile sync stamps `user_id`.

## Steps

### 1) Shell
Head: `supabase@2 → config.js → db.js → page` (no chart). Copy :root, topbar+sidenav (Restock active). Content: summary row (2 cards) + table card (expandable). Helpers: $, esc, peso, showError.

### 2) Summary
From fetched rows:
- Total restock spend this month = sum `r.totalCost where date startsWith YYYY-MM`
- Number of restock runs = count rows (or this month count)
Render into 2 `.kpi-card`.

### 3) Table
Columns: Date | Total Cost | Item Count | Expand. Each row `data-log-id` with chevron. On click → expand next `<tr class="detail">` showing line items.

### 4) Expand + JSON parse
```js
function parseItems(row){
  try{
    const raw=row.itemsJson||row.items||row.item_json;
    if(!raw) return [];
    const arr= typeof raw==='string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr)?arr:[];
  }catch(e){ console.warn('itemsJson parse:',e); return []; }
}
// detail HTML:
function detailHtml(items){
  if(!items.length) return '<em>No line items</em>';
  return '<table class="mini"><tr><th>Product</th><th>Cost/Unit</th><th>Qty Added</th><th>Total</th></tr>'
    + items.map(it=>`<tr><td>${esc(it.productName)}</td><td>${peso(it.costPerUnit)}</td><td>${esc(it.qtyAdded)}</td><td>${peso(it.totalCost)}</td></tr>`).join('')
    + '</table>';
}
```
Show total reconciliation: sum line `totalCost` should equal row `totalCost` (display both if mismatch).

### 5) Load
```js
async function main(){
  const s=await requireAuth(); if(!s) return; $('btnSignout').onclick=signOut; DB.init(s);
  let logs=[]; try{logs=await DB.getRestockLog();}catch(e){showError(e.message);renderTable([]);return;}
  renderSummary(logs); renderTable(logs); // wire expand toggle
}
```
Empty state: "No restock runs yet — record one on the mobile app."

## Verify
1. Table shows runs newest first. 2) Expand row → line items with product names + costs. 3) Summary this month matches sum of visible rows. 4) Malformed itemsJson shows "No line items" not crash. 5) Other user's logs not visible.

## Risk
- itemsJson may be string, object, or null — handle all 3.
- Large JSON (100+ items) → limit detail height with `max-height:300px; overflow:auto`.
- Date format may be YYYY-MM-DD or ISO — treat as string prefix match.
- Read-only contract: no Add/Edit/Delete buttons — document why (warehouse activity).
