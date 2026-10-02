# Task 5.4 — Expenses Management

## Problem
Closing's "Expenses" is COGS (cost of goods), not operating expenses. ExpenseTracking analysis §10.1 added operating expense log (v8→v9: `expenses` table + EOD `expenses/netProfit`). Mobile has basic entry; web provides full management for defense Net Profit story.

## Files
- CREATE `backoffice/expenses.html` (~400L)
- MODIFY `backoffice/db.js` — add 2 methods

## db.js Methods

**addExpense(e)** — insert:
```js
async addExpense(e){
  const row={ user_id:this.uid(), id:e.id??Date.now(),
    date:e.date, category:e.category, amount:Number(e.amount),
    note:e.note||'', timestamp:e.timestamp??Date.now() };
  const {data,error}=await sb.from('expenses').insert(row).select().single();
  if(error){console.error('addExpense:',error);return null;} return data;
}
```

**deleteExpense(id)** — scoped:
```js
async deleteExpense(id){
  const {error}=await sb.from('expenses').delete()
    .eq('user_id',this.uid()).eq('id',id);
  if(error){console.error('deleteExpense:',error);return error;} return null;
}
```
SQL: `INSERT INTO expenses ...` / `DELETE WHERE user_id=:uid AND id=:id`.

## Steps

### 1) Shell
Head: `supabase@2 → config.js → db.js → (optional chart.js for category doughnut) → page`. Copy :root, topbar+sidenav (Expenses active). Content: add form card → filter row → summary card → table card. Helpers: $, esc, peso, showError, monthKey.

### 2) Add form
Fields: `date*` (`<input type=date>` default today `new Date().toISOString().slice(0,10)`), `category*` (`<select>` 8 options: utilities, rent, transport, permits, labor, supplies, maintenance, other — from `ExpenseCatalog.CATEGORIES`), `amount*` (number step 0.01), `note` (optional). Validate date+category+amount, `await DB.addExpense({date,category,amount,note})`, reset, success, re-fetch.

### 3) Table
Columns: Date | Category | Amount | Note | Action (Delete). Sorted `date DESC, timestamp DESC`. `esc()` category/note, `peso()` amount. Delete: delegated `.btn-delete[data-id]` → `confirm()` → `await DB.deleteExpense(id)` → re-fetch.

### 4) Month filter
`<select id="monthFilter">` options: `All`, plus `YYYY-MM` distinct from expenses. On change → re-render table + summary with filtered list.

### 5) Category summary
For current month (or selected month): aggregate `expenses.filter by month → group by category → sum amount`. Render small table or doughnut chart (if chart.js loaded: `type:'doughnut'`).

### 6) Load
```js
async function main(){
  const s=await requireAuth(); if(!s) return; $('btnSignout').onclick=signOut; DB.init(s);
  let ex=[]; try{ex=await DB.getExpenses();}catch(e){showError(e.message);renderTable([]);return;}
  renderTable(ex); renderSummary(ex); // wire form, filter, delete
}
```

## Verify
1. Add ₱500 rent today → appears top, month total +500. 2) Filter to last month → table changes. 3) Delete with cancel no-op, confirm removes. 4) Doughnut sums to filtered total. 5) XSS note `<img>` escaped. 6) Other user sees no rows.

## Risk
- Amount NaN → `Number()` + `isFinite` check.
- Category enum drift: keep 8 values in sync with `app.js` + `Strings.kt` + `ExpenseCatalog`.
- Date today default must be local YYYY-MM-DD, not UTC shift.
