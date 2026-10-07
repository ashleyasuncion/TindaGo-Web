# Fractional Quantity Spec — Web Parity (Decision A)

**Status:** Implemented on web (`app.js` + `checkout.html` + `add_product.html` + `restock.html/js`). Mobile to follow with same helpers.

## Goal
Enable `0.25` steps for bulk/loose units (`kg/g/L/mL`) while `piece`-family stays at `1`. Bug report (`0.5` reverted to `1`) is a **data** issue: `rice` stored as `piece` → picker correctly rejects `0.5`. Fix is one-time `rice piece → kg`, not picker.

## Decision
**Option A — enum rule (chosen):** `isFractionalUnit(u)` = `kg|g|l|ml` (case-insensitive) → `stepFor = minFor = 0.25`, else `1`. Zero migration, keep DB `v13 double precision` (`supabase_v2.sql` + `db_indexed.js`). B (`qtyStep/minQty` per product + `v13→v14 ALTER`) and C (freeform heuristics) deferred unless non-0.25 step needed (e.g. ice bag `0.3`).

## Web helpers (`app.js` top, `restock.js` mirror)
```js
var isFractionalUnit = function(u){ var s=String(u||'').trim().toLowerCase(); return s==='kg'||s==='g'||s==='l'||s==='ml'; };
var stepFor = function(u){ return isFractionalUnit(u)?0.25:1; };
var minFor  = function(u){ return isFractionalUnit(u)?0.25:1; };
var roundQty = function(q){ return Math.round(Number(q)*100)/100; };
var parseQty = function(v,fb){ var n=parseFloat(v); if(isNaN(n)||!isFinite(n)) return fb; return Math.round(n*100)/100; };
```

## Checkout Step 1 picker (`checkout.html#step1`)
- `id=saleQty` static `min="1" step="1" inputmode="decimal" oninput="onQtyInput()" onchange="onQtyChange()"` — JS overrides per selection via `syncStep1PickerState` (`dom.saleQty.min/step/inputMode` from `minFor/stepFor`).
- `selectProduct(id)` sets `min/step/inputMode` immediately.
- `onQtyInput()` — live, no clamp (allows `""` and `0.`), only `updateSaleTotal()` + `syncStep1PickerState()`.
- `onQtyChange()` — `parseQty` → snap `min + round((qty-min)/step)*step` → clamp `[min, stock]` via `roundQty`.
- `adjustQty(delta)` — `roundQty(max(min, parseQty(value,min)+delta*step))` clamped to stock.
- `syncStep1PickerState()` — `_su/_mn/_st`, updates input, badge `#saleQtyStepBadge` (`0.25 kg steps ✓` green vs `0.25 for kg/g/L/ml • 1 for piece` blue), hint `#saleQtyHint` with `formatCurrency(price*0.25)`, disables `Add to Cart` when `qty<min || qty>stock`, toggles `±` disabled.
- `updateSaleTotal()` — `parseQty` + `roundQty`.
- `addToCart()` — validates `_am = minFor(unit)`, merge uses `roundQty`.
- Cart (`renderSaleCart`): per-line `min=_minL` `step=stepFor(unit)` `inputmode=decimal`, `cartAdjustQty` uses `step`, `cartSetQty` uses `parseQty` + `roundQty`.

## Add / Edit product (`add_product.html` + `app.js`)
- HTML now ships 17 static options fallback: `piece,sachet,pack,box,bottle,can,kg,g,L,mL,bundle,dozen,sack,loaf,tube,bar,sticks` (matches `db_indexed.js` `UNITS`); JS repopulates from `PRODUCT_UNITS` with `productUnitLabel` for i18n.
- Helper `syncAddProductQtyInputs()` keeps `productQty` (`min/step/inputMode = minFor/stepFor`, placeholder = `min`) and `productLowStock` (`min 0, step=stepFor`) in sync:
  - wired on `productUnit` `change` in `add_product` init,
  - called from `fillProductFormFromEdit` and `resetAddProductFields` (fresh add / bfcache pageshow).
- `saveProduct()` uses `parseQty(value, _qtyMin)` with `roundQty` (fallback `String(_qtyMin)`), `lowStock` via `parseQty`; rejects `qty < _qtyMin`.

## Restock
- `restock.html` purchase qty: `min="0.01" step="0.01" inputmode="decimal"`.
- `restock.js` already fractional: `onCorrectionChange` (`_cMin`), `addPurchase` (`_pMin`).

## Manual matrix
- `kg stock=10` → `0.25` stays, `+` → `0.50`, `0.33` blur → `0.25`, `0.5` enables + total `price*0.5` → sale `9.75`.
- `piece` → `0.5` disabled, blur snaps `1`.
- `stock=0.25` sells last quarter; `stock < min && >0` uses stock itself.

## Verification
```bash
python verify_stage3.py  # 29/29 OK + node --check
node --check app.js restock.js db_indexed.js sync.js backup.js
```

## Mobile parity (Kotlin)
```kotlin
fun isFractionalUnit(u: String?): Boolean { val s=u?.trim()?.lowercase()?:return false; return s=="kg"||s=="g"||s=="l"||s=="ml" }
fun stepFor(u: String?) = if(isFractionalUnit(u)) 0.25 else 1.0
fun minFor(u: String?)  = if(isFractionalUnit(u)) 0.25 else 1.0
fun roundQty(q: Double) = kotlin.math.round(q*100)/100.0
fun parseQty(v: String?, fb: Double): Double { val n=v?.trim()?.toDoubleOrNull() ?: return fb; if(!n.isFinite()) return fb; return roundQty(n) }
```

## Data fix (one-time)
```js
var p = state.products.find(x=>x.name.toLowerCase().includes('rice')); p.unit='kg'; TindaDB.saveState(state);
```
No schema migration under Option A.
