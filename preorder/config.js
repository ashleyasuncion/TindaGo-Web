// ── TindaGo — Pre-Order Customer Page — Supabase Configuration ──
// Anonymous, store-scoped reads only. Mirrors backoffice/config.js but for
// the public pre-order flow: no auth, no user-scoped writes.
//
// Script order on preorder/index.html:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="config.js"></script>
//   <script src="app.js"></script>

const SUPABASE_URL = 'https://gncnluxjrpmbjmtzcwsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduY25sdXhqcnBtYmptdHpjd3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTcwODAsImV4cCI6MjEwNTk5MzA4MH0.Ynto-Kz-CdIrE9jqJT2s-PJtiGFIYzr4Qg9hC16_Ris';

// Initialize Supabase CDN client (window.supabase from the CDN script tag)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Read the ?store=<uid>, ?code=<short slug> and &demo=1 query params from the
 * current URL. Returns { storeUid, storeCode, demo }.
 *
 * ?store= is the back-compat direct-UUID path (QRs printed before the short-code
 * rollout still work). ?code= is the friendly short-code path resolved to a UUID
 * via get_uid_by_slug before the profile/products fetch. When both are absent the
 * app falls through to the store-code entry screen.
 */
function parsePreorderUrl() {
    const params = new URLSearchParams(window.location.search);
    const storeUid = (params.get('store') || '').trim();
    const storeCode = (params.get('code') || '').trim();
    const demo = params.get('demo') === '1' || params.get('demo') === 'true';
    return { storeUid: storeUid || null, storeCode: storeCode || null, demo };
}

/**
 * Resolve a friendly store code (slug) to the store's auth.users UUID via the
 * get_uid_by_slug RPC. Returns the UUID string, or null when unknown/error.
 */
async function resolveStoreCode(storeCode) {
    if (!storeCode) return null;
    try {
        const { data, error } = await sb.rpc('get_uid_by_slug', { p_slug: storeCode });
        if (error) { console.error('resolveStoreCode:', error); return null; }
        const row = Array.isArray(data) && data.length ? data[0] : null;
        return (row && row.user_id) ? String(row.user_id) : null;
    } catch (e) {
        console.error('resolveStoreCode throw:', e);
        return null;
    }
}

/**
 * Create/refresh the owner's slug row from store_profiles.store_code without
 * requiring an extra field on the profile form. The stored code is kept in sync
 * with store_slugs (single source of truth = store_profiles.store_code).
 */
async function syncStoreSlug(storeCode, storeUid) {
    if (!storeCode || !storeUid) return;
    try {
        await sb.from('store_slugs').upsert(
            { slug: storeCode, user_id: storeUid, updated_at: Date.now() },
            { onConflict: 'slug' }
        );
    } catch (e) {
        // Non-blocking: a failed sync just means the printed code won't resolve
        // until it's saved again; the owner page already wrote store_code.
        console.error('syncStoreSlug:', e);
    }
}

/**
 * Read the store's public profile (store_profiles) for the landing header and
 * the Phase 6 C "Enable pre-ordering" gate. Anonymous read is allowed by RLS
 * (store_profiles_public_select).
 * Returns { store_name, address, is_preorder_enabled, gcash_number } or null if missing/error.
 */
async function fetchStoreProfile(storeUid) {
    if (!storeUid) return null;
    try {
        const { data, error } = await sb
            .from('store_profiles')
            .select('store_name, address, is_preorder_enabled, gcash_number')
            .eq('user_id', storeUid)
            .maybeSingle();
        if (error) { console.error('fetchStoreProfile:', error); return null; }
        return data || null;
    } catch (e) {
        console.error('fetchStoreProfile throw:', e);
        return null;
    }
}

/**
 * Fetch the public product list for a store via the RPC get_public_products.
 * SECURITY DEFINER projection: id, name, unit, price, quantity, package_size, brand.
 * Never exposes cost_price. Returns [] on any error.
 */
async function fetchPublicProducts(storeUid) {
    if (!storeUid) return [];
    try {
        const { data, error } = await sb.rpc('get_public_products', { p_store_uuid: storeUid });
        if (error) { console.error('fetchPublicProducts:', error); return []; }
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('fetchPublicProducts throw:', e);
        return [];
    }
}
