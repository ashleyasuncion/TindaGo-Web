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
 * Read the ?store=<uid> and &demo=1 query params from the current URL.
 * Returns { storeUid: string|null, demo: boolean }.
 */
function parsePreorderUrl() {
    const params = new URLSearchParams(window.location.search);
    const storeUid = (params.get('store') || '').trim();
    const demo = params.get('demo') === '1' || params.get('demo') === 'true';
    return { storeUid: storeUid || null, demo };
}

/**
 * Read the store's public profile (store_profiles) for the landing header and
 * the Phase 6 C "Enable pre-ordering" gate. Anonymous read is allowed by RLS
 * (store_profiles_public_select).
 * Returns { store_name, address, is_preorder_enabled } or null if missing/error.
 */
async function fetchStoreProfile(storeUid) {
    if (!storeUid) return null;
    try {
        const { data, error } = await sb
            .from('store_profiles')
            .select('store_name, address, is_preorder_enabled')
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
