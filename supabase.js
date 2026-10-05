/* ============================================
   TindaGo — Supabase Config + Auth (Step 2)
   Vanilla fetch, IIFE, no deps
   Mirrors SupabaseConfig.kt (tindago_sync_prefs)
   Stack: fetch (zero-dep) — 1:1 SyncRepository.kt port
   Credentials: Supabase Dashboard → Settings → API
   Usage: <script src="supabase.js"></script> after db_indexed.js, before sync.js
   Verify: node --check supabase.js
   ============================================ */
;(function (global) {
  'use strict';

  // ── Project (wired 2026-09-26, Settings → API) ──
  // Bare host — no /rest/v1 suffix (sync.js appends /auth/v1 + /rest/v1)
  var SUPABASE_URL = 'https://gncnluxjrpmbjmtzcwsv.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduY25sdXhqcnBtYmptdHpjd3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTcwODAsImV4cCI6MjEwNTk5MzA4MH0.Ynto-Kz-CdIrE9jqJT2s-PJtiGFIYzr4Qg9hC16_Ris';

  var PREFS_KEY = 'tindago_sync_prefs';
  // keys inside JSON: access_token, refresh_token, user_id, user_email, last_sync_timestamp

  function _loadPrefs() {
    try {
      var raw = global.localStorage ? global.localStorage.getItem(PREFS_KEY) : null;
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch (_) { return {}; }
  }
  function _savePrefs(obj) {
    try { if (global.localStorage) global.localStorage.setItem(PREFS_KEY, JSON.stringify(obj || {})); } catch (_) {}
  }

  function getToken() { return _loadPrefs().access_token || null; }
  function getRefreshToken() { return _loadPrefs().refresh_token || null; }
  function getUserId() { return _loadPrefs().user_id || null; }
  function getEmail() { return _loadPrefs().user_email || null; }
  function isLoggedIn() { return !!getToken(); }
  function getLastSyncTime() { return Number(_loadPrefs().last_sync_timestamp) || 0; }
  function saveLastSyncTime(ts) {
    var p = _loadPrefs();
    p.last_sync_timestamp = Number(ts) || Date.now();
    _savePrefs(p);
  }
  function saveSession(accessToken, refreshToken, uid, email) {
    var p = _loadPrefs();
    p.access_token = String(accessToken || '');
    if (refreshToken != null) p.refresh_token = String(refreshToken);
    if (uid != null) p.user_id = String(uid);
    if (email != null) p.user_email = String(email);
    _savePrefs(p);
  }
  function logout() {
    try { if (global.localStorage) global.localStorage.removeItem(PREFS_KEY); } catch (_) {}
    // keep last_sync_timestamp cleared as well
  }

  var SYNC_INTERVAL_KEY = 'tindago_sync_interval_hours';

  function getSyncInterval() {
    try {
      var v = global.localStorage ? global.localStorage.getItem(SYNC_INTERVAL_KEY) : null;
      if (v == null || v === '') return 24;
      var n = Number(v);
      if (n === 0 || n === 12 || n === 24) return n;
      return 24;
    } catch (_) { return 24; }
  }

  function setSyncInterval(h) {
    var n = Number(h);
    if (n !== 0 && n !== 12 && n !== 24) n = 24;
    try { if (global.localStorage) global.localStorage.setItem(SYNC_INTERVAL_KEY, String(n)); } catch (_) {}
    return n;
  }

  async function refreshSession() {
    var rt = getRefreshToken();
    if (!rt) throw new Error('No refresh_token');
    var url = SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token';
    var res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: rt })
      });
    } catch (e) {
      throw new Error(e && e.message ? e.message : 'Network error');
    }
    var json;
    try { json = await res.json(); } catch (_) { json = {}; }
    if (res.ok) {
      var token = json.access_token;
      var refresh = json.refresh_token || rt;
      var uid = json.user && json.user.id ? json.user.id : getUserId();
      var mail = json.user && json.user.email ? json.user.email : getEmail();
      if (!token) throw new Error('Missing access_token on refresh');
      saveSession(token, refresh, uid, mail);
      return token;
    } else {
      var msg = json.error_description || json.error || json.msg || 'Refresh failed';
      var err = new Error(String(msg));
      try { err.status = res.status; } catch (_) {}
      throw err;
    }
  }

  // ── Auth: POST /auth/v1/token?grant_type=password ──
  async function signIn(email, password) {
    var url = SUPABASE_URL + '/auth/v1/token?grant_type=password';
    var res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: String(email || '').trim(), password: String(password || '') })
      });
    } catch (e) {
      throw new Error(e && e.message ? e.message : 'Network error');
    }
    var json;
    try { json = await res.json(); } catch (_) { json = {}; }
    if (res.ok) {
      var token = json.access_token;
      var refresh = json.refresh_token || null;
      var uid = json.user && json.user.id ? json.user.id : null;
      var mail = json.user && json.user.email ? json.user.email : email;
      if (!token) throw new Error('Missing access_token');
      saveSession(token, refresh, uid, mail);
      return 'Signed in as ' + mail;
    } else {
      var msg = json.error_description || json.error || json.msg || 'Login failed';
      throw new Error(String(msg));
    }
  }

  // expose
  var Supabase = {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    PREFS_KEY: PREFS_KEY,
    SYNC_INTERVAL_KEY: SYNC_INTERVAL_KEY,
    getToken: getToken,
    getRefreshToken: getRefreshToken,
    getUserId: getUserId,
    getEmail: getEmail,
    isLoggedIn: isLoggedIn,
    getLastSyncTime: getLastSyncTime,
    saveLastSyncTime: saveLastSyncTime,
    saveSession: saveSession,
    logout: logout,
    signIn: signIn,
    refreshSession: refreshSession,
    getSyncInterval: getSyncInterval,
    setSyncInterval: setSyncInterval
  };

  try { global.Supabase = Supabase; } catch (_) {}
  try { global.TindaSupabase = Supabase; } catch (_) {}
})(typeof window !== 'undefined' ? window : this);
