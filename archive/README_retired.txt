RETIREMENT NOTICE — TindaGo Legacy Order Inbox Files
=====================================================

Date retired: 2026-10-11
Replaced by: backoffice/preorders.html (new owner pre-orders inbox)

Files archived here:
---------------------
1. orders.html          — Legacy owner inbox page with localStorage/IndexedDB prototype logic
2. order_detail.html    — Legacy order detail overlay (validate/cancel actions)
3. orders/index.html    — Meta-refresh redirect to orders.html

Why retired:
------------
These files belonged to the 18-page localStorage/IndexedDB prototype web app that was
never to be touched per the Hybrid Consolidation strategy (Stage 6 plan). The new
backoffice/preorders.html provides a clean, Supabase-connected owner inbox that mirrors
the Android app's fetch logic exactly, guaranteeing data parity across all surfaces.

Migration path:
---------------
- Owner inbox: Use backoffice/preorders.html instead
  - Fetches pending pre-orders from Supabase with status='pending', owner-scoped
  - VALIDATE action marks fulfilled + paid
  - CANCEL action marks cancelled, preserves payment_status
- Navigation: Sidebar entry "Pre-Orders" → preorders.html (added Stage 2)
- Customer storefront: preorder/index.html?store=<uid> remains active (anonymous INSERT path)

Verification:
-------------
Stage 3 parity check confirmed identical filter logic, field mapping, and update semantics
across web inbox (db.js), Android inbox (SyncRepository.kt), and Supabase schema (preorder_v1.sql).

Notes:
------
- These files are preserved (not deleted) for fallback reference during transition
- Do not modify; all new work targets backoffice/preorders.html or Android PreOrdersScreen.kt
- The ?store= link wiring fix (Stage 2) ensures customer storefront loads with proper store context

Co-Authored-By: Claude Code <noreply@anthropic.com>