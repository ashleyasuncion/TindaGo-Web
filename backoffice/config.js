// ── TindaGo Back Office — Supabase Configuration & Auth Helpers ──
// Connects to the shared Supabase cloud database instance.
// Schema v2: Multi-tenant, composite PKs, user-scoped RLS policies.

const SUPABASE_URL = 'https://gncnluxjrpmbjmtzcwsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduY25sdXhqcnBtYmptdHpjd3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTcwODAsImV4cCI6MjEwNTk5MzA4MH0.Ynto-Kz-CdIrE9jqJT2s-PJtiGFIYzr4Qg9hC16_Ris';

// Initialize Supabase CDN client
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Returns current session or redirects to login.html if unauthenticated.
 * Call this at the start of any protected back-office page load.
 */
async function requireAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}

/**
 * Returns the current authenticated user's UUID.
 */
function getUserId(session) {
    return session?.user?.id || null;
}

/**
 * Signs the user out from Supabase and redirects to login.html.
 */
async function signOut() {
    await sb.auth.signOut();
    window.location.href = 'login.html';
}
