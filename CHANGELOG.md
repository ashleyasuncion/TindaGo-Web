# TindaGo Changelog

## [Unreleased]

### Fixed
- **Incognito mode crash** (`preorder/app.js:923`): Wrapped `localStorage.getItem('DEV_STORE_UID')` in `try/catch` to prevent `SecurityError` in private browsing modes. The app now degrades gracefully when localStorage is unavailable.

### Added
- Live stock refresh every 20 seconds in `preorder/app.js` via `startStockRefresh()` and `refreshStock()`.
- Status badges in product cards showing stock levels (plenty/low/out) matching mobile app colors.
- GCash payment integration via PayMongo checkout session (`preorder/app.js:processGcashPayment()`).
- Atomic stock claims via `place_preorder()` RPC (`sql/preorder_stock_v1.sql`).
- Order-time stock validation via `fetchPublicProducts()` before order placement.

### Changed
- Removed `localStorage.getItem('DEV_STORE_UID')` fallback that caused incognito crashes.
- `submitPreOrder()` now calls `place_preorder()` RPC instead of direct `pre_orders` INSERT (the anonymous-insert policy was dropped for stock safety).
- Product listings now show ALL products (including out-of-stock) with status badges, matching mobile behavior.
- Removed `?pay=gcash` URL parameter convention in favor of explicit payment method selection.