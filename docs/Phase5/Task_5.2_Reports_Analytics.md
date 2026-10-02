# Task 5.2 — Reports & Analytics

## Problem
Mobile reports removed (Phase 4). Web must provide period analytics + export — the "wow" laptop moment for defense. Sari-sari volumes <10K rows → client-side fetch+compute, no server aggregation.

## Files
- CREATE `backoffice/reports.html` (~500L) — standalone, needs Chart.js v4
- MODIFY `backoffice/db.js` — optional helpers; prefer client-side filter from existing `getSales()`/`getExpenses()` (no new table). If added: `getSalesByDateRange(from,to)` and `getExpensesByDateRange` as convenience — not required.

## db.js (optional)
```js
// Only if you want server-side range; otherwise filter client-side:
// Example pattern (stays user_id scoped):
async getSalesByDateRange(from, to){
  const {data,error}=await sb.from('specific_sales').select('*')
    .eq('user_id',this.uid()).gte('date',from).lte('date',to).order('timestamp');
  if(error){console.error(error);return[];} return data;
}
```
Recommendation: skip new methods, filter `getSales()`+`getExpenses()` in page JS for capstone.

## Steps

### 1) Shell
Head: `supabase@2 → config.js → db.js → chart.js@4 → page`. Copy :root 16 tokens, topbar+sidenav (Reports active). Content: period selector row + KPI row (6 cards) + 2 chart cards + 2 table cards + export row. Helpers: $, esc, peso, showError, formatDate.

### 2) Period selector
Tabs/dropdown: `Today | This Week | This Month | Custom Range`. Custom shows 2 `<input type=date>` pickers. On change → `reload()` re-fetches or re-filters and re-renders. Default: This Week.

### 3) KPIs (computed client-side from filtered sales+expenses)
- Total Sales = sum `s.amount`
- Total Profit = sum `s.profit`
- Total Expenses = sum `e.amount`
- Net Profit = profit - expenses
- Transaction Count = filtered sales length
- Avg Transaction Value = sales/count
Render into 6 `.kpi-card` with peso() and toFixed(2). Use `esc()` for labels.

### 4) Charts (Chart.js v4 — destroy/recreate)
- Sales trend: `type:'line'` daily totals across selected period. Labels = dates, data = sum per day.
- Expense breakdown: `type:'doughnut'` by `e.category` total.
Pattern:
```js
let salesChart=null, expChart=null;
function drawSales(labels, data){
  if(salesChart) salesChart.destroy();
  salesChart=new Chart($('salesCanvas'),{type:'line',data:{labels,datasets:[{data}]},options:{responsive:true}});
}
```

### 5) Tables
- Best sellers Top 10: aggregate `specific_sales.description` → `quantity` sum, sort desc, slice 10. Columns: Rank | Product | Qty Sold | Revenue (if available).
- Profit margin: per-product revenue, cost (`qty*costPrice` if product map available via getProducts), margin. Join sales description to product name.

### 6) CSV Export (client-side)
```js
function exportCsv(rows){
  const header=['date','description','amount','quantity','profit'];
  const csv=[header.join(',')].concat(rows.map(r=>
    [r.date, '"'+String(r.description).replace(/"/g,'""')+'"', r.amount, r.quantity, r.profit].join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='tindago-report-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
}
```
Button `#btnExport` triggers with currently filtered sales.

### 7) Load
```js
async function main(){
  const s=await requireAuth(); if(!s) return; $('btnSignout').onclick=signOut; DB.init(s);
  const [sales, expenses, products]=await Promise.all([DB.getSales(), DB.getExpenses(), DB.getProducts()]);
  // wire period selector → filterByDate(sales/expenses, period) → renderKPIs → drawCharts → tables
}
```

## Verify
1. Today shows only today's rows. 2) This Week line chart has 7 points (zero-fill missing days). 3) Doughnut sums to month expenses. 4) Best sellers top row matches manual `SELECT description, SUM(quantity)`. 5) Export opens in Excel with correct header. 6) Empty period shows "No sales yet" placeholder slice. 7) Charts survive rapid period switching (no canvas-reuse error).

## Risk
- Chart canvas reuse → always `destroy()` before `new Chart`.
- Date timezone: use `YYYY-MM-DD` strings from DB, not local Date parse drift.
- Profit margin needs product cost lookup — if product deleted, show `—` not `NaN`.
- Large data: <10K fine; if >20K consider pagination later (out of scope).
