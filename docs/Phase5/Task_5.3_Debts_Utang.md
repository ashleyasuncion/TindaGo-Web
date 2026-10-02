# Task 5.3 — Debts / Utang Ledger

## Problem
Mobile only records quick payment at counter. Defense needs full utang visibility — the #1 sari-sari pain point. Web portal proves the system tracks aging, history, and balance correctly.

## Files
- CREATE `backoffice/debts.html` (~500L) — standalone, no chart.js
- MODIFY `backoffice/db.js` — add 1 method

## db.js Method

**addPayment(debtId, amount, note)** — insert payment, user_id scoped:
```js
async addPayment(debtId, amount, note){
  const row={ user_id:this.uid(), debt_id:debtId, amount:Number(amount), note:note||'', timestamp:Date.now() };
  const {data,error}=await sb.from('debt_payments').insert(row).select().single();
  if(error){console.error('addPayment:',error);return null;} return data;
}
```
SQL: `INSERT INTO debt_payments (user_id, debt_id, amount, note, timestamp) VALUES (...)`
Note: remaining_balance is derived client-side (or via trigger if DB has one); portal just records payment — balance recomputed on next fetch from `customer_debts.remaining_balance` + payments.

## Steps

### 1) Shell
Head: `supabase@2 → config.js → db.js → page`. Copy :root, topbar+sidenav (Debts active). Content: 4 summary cards row → debtor table card → detail panel (hidden initially). Helpers: $, esc, peso, showError, daysSince.

### 2) Summary cards
Fetch `debts = await DB.getDebts()`, `payments = await DB.getPayments()`, `transactions = await DB.getDebtTransactions()`.
Compute:
- Total Outstanding = sum `d.remainingBalance where >0`
- Active Debtors = count `remainingBalance > 0`
- Overdue = count `remainingBalance>0 && daysSince(createdAt) > 30`
- Largest Single Debt = max `remainingBalance`
Helper `daysSince(ts)` parses `created_at` string or timestamp.

### 3) Debtor table
Columns: Customer | Phone | Original Amount | Remaining | Credit Limit | Days Since Created | Status (active/paid off). Clickable rows (`<tr data-debt-id>`). Aging color: row class green `<7d`, amber `7-30d`, red `>30d` if `remaining>0`. Sort by remaining desc default. `esc()` all names/phones.

### 4) Detail panel (expand on row click)
When row clicked:
- Show panel with customer header + 3 sections:
  a) Transaction history — filter `debt_transactions where debtId==selected`, map `{type, description, amount, timestamp}`, sort asc, render table.
  b) Payment history — filter `debt_payments where debtId==selected`, table Date/Amount/Note.
  c) Running balance timeline — merge both arrays by timestamp, compute running balance starting from `debt.amount` minus payments (or use `remainingBalance` as current and walk backwards).
- Use `esc()` on description/note.

### 5) Record payment form (inside detail)
Fields: `amount*` (number), `note` (optional). Submit:
```js
const row=await DB.addPayment(selectedId, amount, note);
if(!row){showError('Payment failed');return;}
showSuccess('Payment recorded'); // re-fetch debts+payments and re-render table+detail
debts=await DB.getDebts(); payments=await DB.getPayments(); renderTable(); renderDetail(selectedId);
```

### 6) Load
```js
async function main(){
  const s=await requireAuth(); if(!s) return; $('btnSignout').onclick=signOut; DB.init(s);
  let debts=[],payments=[],txs=[];
  try{[debts,payments,txs]=await Promise.all([DB.getDebts(),DB.getPayments(),DB.getDebtTransactions()]);}
  catch(e){showError(e.message);renderTable([]);return;}
  renderSummary(debts); renderTable(debts); // wire row click → detail, payment form
}
```

## Verify
1. Summary counts match manual: Active = open rows, Overdue = >30d.
2. Click Aling Nena → transactions+payments appear, timeline balance ends at remaining.
3. Record ₱100 payment → remaining decreases by 100 after reload, new row in payments table.
4. Aging: debt 5d ago green, 15d amber, 40d red (with balance >0). Paid-off (0) no color.
5. XSS: customer name `<b>` renders escaped.
6. RLS: other user's debts not visible.

## Risk
- `debt_id` FK: ensure id passed as Number, matches `customer_debts.id` PK second column (user_id scope prevents cross-store).
- Balance: don't update `customer_debts.remaining_balance` from portal unless trigger exists — just insert payment; next sync or DB trigger recalculates. Document this.
- Concurrency: two payments at same time → both insert ok, balance sum still correct on next fetch.
- Phone formatting: display raw string with esc(), don't auto-link.
