/* ============================================
   TindaGo — IndexedDB Foundation (Step 1)
   Mirrors mobile Room schema AppDatabase v13
   Offline-first, vanilla JS, no deps
   ============================================
   Mobile source: AppDatabase.kt v12 entities:
     products, daily_entries, specific_sales, customer_debts,
     end_of_day_data, restock_log, debt_payments,
     debt_transactions, expenses, sms_log
   Models.kt: ProductCatalog 12 cats / 17 units / 2-level subs
   Web before: sync localStorage sss_v3_* (~371KB app.js IIFE)
   This file: ONE DB "tindago_db" v13, 11 stores, Promise API,
              LS → IDB one-time migration, dual-write rollback.
   Usage: <script src="db_indexed.js"></script> before app.js
          await TindaDB.ready
   Verify: node --check db_indexed.js
============================================ */
;(function (global) {
  'use strict';
  var DB_NAME = 'tindago_db';
  var DB_VERSION = 13;
  var CATEGORIES = ['pantry_staples','canned_goods','instant_dry_goods','snacks_sweets','beverages','dairy_refrigerated','fresh_section','liquor_wine','personal_care','household_care','baby_care','paper_sanitary'];
  var SUBCATEGORIES = {
    pantry_staples:['rice','cooking_oil','sugar','salt','vinegar','bread'],
    canned_goods:['sardines','corned_beef','tuna','meat_loaf','sausage'],
    instant_dry_goods:['instant_noodles','cup_noodles','pasta','soup_mixes'],
    snacks_sweets:['chips','crackers','candies','chocolates','cookies'],
    beverages:['coffee_mix','powdered_milk','chocolate_drink','juice','soft_drinks','bottled_water'],
    dairy_refrigerated:['cheese','butter','margarine','chilled_meats'],
    fresh_section:['fresh_meat','fresh_seafood','fruits','vegetables','eggs'],
    liquor_wine:['beer','gin','brandy','wine','cigarettes'],
    personal_care:['shampoo','conditioner','bath_soap','toothpaste','toothbrush','lotion','cosmetics'],
    household_care:['laundry','fabric_softener','dishwashing','cleaners','trash_bags','mosquito_control'],
    baby_care:['diapers','baby_wipes','baby_toiletries'],
    paper_sanitary:['tissue','paper_towels','sanitary_pads']
  };
  var UNITS = ['piece','sachet','pack','box','bottle','can','kg','g','L','mL','bundle','dozen','sack','loaf','tube','bar','sticks'];
  var EXPENSE_CATEGORIES = ['utilities','rent','transport','permits','labor','supplies','maintenance','other'];
  var LS_PREFIX = 'sss_v3_';
  var LS_KEYS = ['settings','products','sales','debts','history','dayOpen','dayDate','dayArchived','todayExpenses','todayEarnings','expenseLog'];
  var dbInstance = null;
  var readyResolve, readyReject;
  var ready = new Promise(function (res, rej) { readyResolve = res; readyReject = rej; });
  // ── Open / Upgrade ──────────────────────────────────
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (dbInstance) return resolve(dbInstance);
      if (!('indexedDB' in global)) return reject(new Error('IndexedDB not supported'));
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        function ensureStore(name, opts) {
          if (!db.objectStoreNames.contains(name)) return db.createObjectStore(name, opts);
          return e.target.transaction.objectStore(name);
        }
        var products = ensureStore('products', { keyPath: 'id' });
        ensureStore('specific_sales', { keyPath: 'id' });
        ensureStore('customer_debts', { keyPath: 'id' });
        ensureStore('debt_payments', { keyPath: 'id' });
        ensureStore('debt_transactions', { keyPath: 'id' });
        ensureStore('expenses', { keyPath: 'id' });
        ensureStore('daily_entries', { keyPath: 'date' });
        ensureStore('end_of_day_data', { keyPath: 'date' });
        ensureStore('restock_log', { keyPath: 'id' });
        ensureStore('sms_log', { keyPath: 'id', autoIncrement: true });
        ensureStore('app_meta', { keyPath: 'key' });
        try { if (!products.indexNames.contains('category')) products.createIndex('category', 'category', { unique: false }); } catch (_) {}
        try { if (!products.indexNames.contains('brand')) products.createIndex('brand', 'brand', { unique: false }); } catch (_) {}
        try {
          var sales = e.target.transaction.objectStore('specific_sales');
          if (!sales.indexNames.contains('date')) sales.createIndex('date', 'date', { unique: false });
          if (!sales.indexNames.contains('transactionId')) sales.createIndex('transactionId', 'transactionId', { unique: false });
        } catch (_) {}
        try {
          var debts = e.target.transaction.objectStore('customer_debts');
          if (!debts.indexNames.contains('customerName')) debts.createIndex('customerName', 'customerName', { unique: false });
        } catch (_) {}
        try {
          var pays = e.target.transaction.objectStore('debt_payments');
          if (!pays.indexNames.contains('debtId')) pays.createIndex('debtId', 'debtId', { unique: false });
        } catch (_) {}
        try {
          var txs = e.target.transaction.objectStore('debt_transactions');
          if (!txs.indexNames.contains('debtId')) txs.createIndex('debtId', 'debtId', { unique: false });
        } catch (_) {}
        try {
          var exps = e.target.transaction.objectStore('expenses');
          if (!exps.indexNames.contains('date')) exps.createIndex('date', 'date', { unique: false });
          if (!exps.indexNames.contains('category')) exps.createIndex('category', 'category', { unique: false });
        } catch (_) {}
        try {
          var sms = e.target.transaction.objectStore('sms_log');
          if (!sms.indexNames.contains('debtId')) sms.createIndex('debtId', 'debtId', { unique: false });
        } catch (_) {}
      };
      req.onsuccess = function () {
        dbInstance = req.result;
        dbInstance.onclose = function () { dbInstance = null; };
        dbInstance.onversionchange = function () { try { dbInstance.close(); } catch (_) {} dbInstance = null; };
        resolve(dbInstance);
      };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { console.warn('[TindaDB] open blocked — close other tabs'); };
    });
  }

  // ── Generic helpers ─────────────────────────────────
  function getAllFrom(storeName) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function getByKey(storeName, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function putMany(storeName, arr) {
    if (!arr || !arr.length) return Promise.resolve();
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        arr.forEach(function (v) { store.put(v); });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function deleteByKey(storeName, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        var req = tx.objectStore(storeName).delete(key);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function clearStore(storeName) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        var req = tx.objectStore(storeName).clear();
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  // ── Normalizers (Room migration parity) ─────────────
  function normalizeProduct(p) {
    if (!p || typeof p !== 'object') return p;
    return {
      id: String(p.id),
      name: String(p.name || ''),
      quantity: Number(p.quantity) || 0,
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      unit: UNITS.indexOf(p.unit) >= 0 ? p.unit : 'piece',
      lowStockThreshold: Number.isFinite(p.lowStockThreshold) ? Number(p.lowStockThreshold) : 5,
      category: CATEGORIES.indexOf(p.category) >= 0 ? p.category : (p.category ? '' : ''),
      subcategory: p.subcategory || '',
      brand: p.brand || '',
      packageSize: p.packageSize || ''
    };
  }
  function normalizeDebt(d) {
    if (!d || typeof d !== 'object') return d;
    return {
      id: Number(d.id) || d.id,
      customerName: String(d.customerName || d.customer_name || ''),
      amount: Number(d.amount) || 0,
      remainingBalance: Number(d.remainingBalance != null ? d.remainingBalance : d.remaining_balance) || 0,
      createdAt: Number(d.createdAt || d.created_at) || Date.now(),
      creditLimit: d.creditLimit != null ? Number(d.creditLimit) : (d.credit_limit != null ? Number(d.credit_limit) : null),
      phoneNumber: String(d.phoneNumber || d.phone_number || ''),
      smsOptIn: d.smsOptIn != null ? !!d.smsOptIn : (d.sms_opt_in != null ? !!d.sms_opt_in : null),
      transactions: Array.isArray(d.transactions) ? d.transactions : undefined
    };
  }
  function normalizeSale(s) {
    if (!s || typeof s !== 'object') return s;
    return {
      id: s.id != null ? s.id : Date.now() + Math.floor(Math.random()*1000),
      date: String(s.date || ''),
      description: String(s.description || ''),
      amount: Number(s.amount) || 0,
      quantity: Number(s.quantity) || 1,
      customerName: s.customerName != null ? String(s.customerName) : (s.customer_name != null ? String(s.customer_name) : null),
      profit: Number(s.profit) || 0,
      timestamp: Number(s.timestamp) || Date.now(),
      transactionId: Number(s.transactionId || s.transaction_id) || 0,
      paymentMethod: s.paymentMethod || s.payment_method || null
    };
  }
  function normalizeExpense(e) {
    if (!e || typeof e !== 'object') return e;
    return {
      id: Number(e.id) || e.id || Date.now(),
      date: String(e.date || ''),
      category: EXPENSE_CATEGORIES.indexOf(e.category) >= 0 ? e.category : 'other',
      amount: Number(e.amount) || 0,
      note: String(e.note || ''),
      timestamp: Number(e.timestamp) || Number(e.createdAt) || Date.now()
    };
  }

  // ── Meta helpers ────────────────────────────────────
  function getMeta(key) {
    return getByKey('app_meta', key).then(function (row) { return row ? row.value : null; });
  }
  function putMeta(key, value) { return putOne('app_meta', { key: key, value: value }); }
  // ── Public API ────────────────────────────────────
  var TindaDB = {
    CATEGORIES: CATEGORIES.slice(),
    SUBCATEGORIES: JSON.parse(JSON.stringify(SUBCATEGORIES)),
    UNITS: UNITS.slice(),
    EXPENSE_CATEGORIES: EXPENSE_CATEGORIES.slice(),
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    ready: ready,
    init: function () {
      return openDB().then(function (db) {
        return Promise.all([
          getAllFrom('products'),
          getAllFrom('specific_sales'),
          getAllFrom('customer_debts'),
          getAllFrom('expenses'),
          getAllFrom('app_meta')
        ]).then(function (results) {
          var hasAny = results.some(function (arr) { return arr && arr.length; });
          if (hasAny) return db;
          var hasLS = false;
          try {
            for (var i = 0; i < LS_KEYS.length; i++) {
              if (global.localStorage && global.localStorage.getItem(LS_PREFIX + LS_KEYS[i]) != null) { hasLS = true; break; }
            }
          } catch (_) { hasLS = false; }
          if (!hasLS) return db;
          console.log('[TindaDB] migrating localStorage -> IndexedDB');
          return migrateFromLocalStorage().then(function () { return db; });
        });
      }).then(function (db) { readyResolve(db); return db; }, function (err) { readyReject(err); throw err; });
    },
    // Products
    getAllProducts: function () { return getAllFrom('products').then(function (arr) { return arr.map(normalizeProduct); }); },
    getProductById: function (id) { return getByKey('products', String(id)).then(function (p) { return p ? normalizeProduct(p) : null; }); },
    putProduct: function (p) { return putOne('products', normalizeProduct(p)); },
    putProducts: function (arr) { return putMany('products', (arr||[]).map(normalizeProduct)); },
    deleteProduct: function (id) { return deleteByKey('products', String(id)); },
    clearProducts: function () { return clearStore('products'); },
    searchProducts: function (q) {
      var s = String(q||'').toLowerCase();
      if (!s) return getAllFrom('products');
      return getAllFrom('products').then(function (arr) {
        return arr.filter(function (p) {
          return String(p.name||'').toLowerCase().indexOf(s) >= 0 || String(p.brand||'').toLowerCase().indexOf(s) >= 0;
        });
      });
    },
    // Sales
    getAllSales: function () { return getAllFrom('specific_sales').then(function (arr){ return arr.map(normalizeSale); }); },
    getSalesByDate: function (date) {
      return openDB().then(function (db){
        return new Promise(function(res,rej){
          var tx=db.transaction('specific_sales','readonly');
          var idx=tx.objectStore('specific_sales').index('date');
          var req=idx.getAll(String(date));
          req.onsuccess=function(){ res((req.result||[]).map(normalizeSale)); };
          req.onerror=function(){ rej(req.error); };
        });
      });
    },
    putSale: function (s) { return putOne('specific_sales', normalizeSale(s)); },
    putSales: function (arr) { return putMany('specific_sales', (arr||[]).map(normalizeSale)); },
    // Debts
    getAllDebts: function () { return getAllFrom('customer_debts').then(function(arr){ return arr.map(normalizeDebt); }); },
    getDebtById: function (id) { return getByKey('customer_debts', Number(id)||id).then(function(d){ return d?normalizeDebt(d):null; }); },
    putDebt: function (d) {
      var nd = normalizeDebt(d);
      var toStore = { id: nd.id, customerName: nd.customerName, amount: nd.amount, remainingBalance: nd.remainingBalance, createdAt: nd.createdAt, creditLimit: nd.creditLimit, phoneNumber: nd.phoneNumber, smsOptIn: nd.smsOptIn==null?null:(nd.smsOptIn?1:0) };
      return putOne('customer_debts', toStore).then(function(){
        if (Array.isArray(d.transactions) && d.transactions.length) {
          var txRows = d.transactions.map(function(tx){
            return { id: Number(tx.id)||Date.now()+Math.floor(Math.random()*10000), debtId: nd.id, type: tx.type||'debt', description: tx.description||null, amount: Number(tx.amount)||0, timestamp: Number(tx.timestamp)||Date.now() };
          });
          return putMany('debt_transactions', txRows);
        }
      });
    },
    putDebts: function (arr) {
      var self=this;
      var seq=Promise.resolve();
      (arr||[]).forEach(function(d){ seq=seq.then(function(){ return self.putDebt(d); }); });
      return seq;
    },
    deleteDebt: function (id) { return deleteByKey('customer_debts', Number(id)||id); },
    clearDebts: function () { return clearStore('customer_debts'); },
    // Debt Payments
    getAllPayments: function () { return getAllFrom('debt_payments'); },
    getPaymentsByDebtId: function (debtId) {
      return openDB().then(function(db){
        return new Promise(function(res,rej){
          var tx=db.transaction('debt_payments','readonly');
          var req=tx.objectStore('debt_payments').index('debtId').getAll(Number(debtId)||debtId);
          req.onsuccess=function(){ res(req.result||[]); };
          req.onerror=function(){ rej(req.error); };
        });
      });
    },
    putPayment: function (p) { return putOne('debt_payments', { id: Number(p.id)||p.id||Date.now(), debtId: Number(p.debtId||p.debt_id)||0, amount: Number(p.amount)||0, timestamp: Number(p.timestamp)||Date.now(), note: p.note||null }); },
    putPayments: function (arr) { var self=this; return Promise.all((arr||[]).map(function(p){ return self.putPayment(p); })); },
    deletePaymentsByDebtId: function(debtId){
      return openDB().then(function(db){
        return new Promise(function(res,rej){
          var tx=db.transaction('debt_payments','readwrite');
          var idx=tx.objectStore('debt_payments').index('debtId');
          var req=idx.getAllKeys(Number(debtId)||debtId);
          req.onsuccess=function(){
            var keys=req.result||[];
            keys.forEach(function(k){ tx.objectStore('debt_payments').delete(k); });
          };
          tx.oncomplete=function(){ res(); };
          tx.onerror=function(){ rej(tx.error); };
        });
      });
    },
    clearPayments: function(){ return clearStore('debt_payments'); },
    // Debt Transactions ledger
    // Restock Log
    getAllRestockLogs: function(){ return getAllFrom('restock_log'); },
    putRestockLog: function(entry){ return putOne('restock_log', { id: String(entry.id), date: String(entry.date), itemsJson: typeof entry.itemsJson==='string'?entry.itemsJson:JSON.stringify(entry.items||[]), totalCost: Number(entry.totalCost||entry.total_cost)||0 }); },
    clearRestockLogs: function(){ return clearStore('restock_log'); },
    // SMS Log
    getAllSmsLogs: function(){ return getAllFrom('sms_log'); },
    putSmsLog: function(log){ return putOne('sms_log', { id: log.id||undefined, debtId: Number(log.debtId||log.debt_id)||0, customerName: String(log.customerName||log.customer_name||''), phoneNumber: String(log.phoneNumber||log.phone_number||''), type: String(log.type||'reminder'), messageBody: String(log.messageBody||log.message_body||''), status: String(log.status||'sent'), timestamp: Number(log.timestamp)||Date.now() }); },
    clearSmsLogs: function(){ return clearStore('sms_log'); },
    // Expenses
    getAllExpenses: function(){ return getAllFrom('expenses').then(function(arr){ return arr.map(normalizeExpense); }); },
    putExpense: function(e){ return putOne('expenses', normalizeExpense(e)); },
    putExpenses: function(arr){ return putMany('expenses', (arr||[]).map(normalizeExpense)); },
    deleteExpense: function(id){ return deleteByKey('expenses', Number(id)||id); },
    clearExpenses: function(){ return clearStore('expenses'); },
    // Daily Entries
    getAllDailyEntries: function(){ return getAllFrom('daily_entries'); },
    getDailyEntryByDate: function(date){ return getByKey('daily_entries', String(date)); },
    putDailyEntry: function(entry){ return putOne('daily_entries', { date: String(entry.date), stockExpenses: Number(entry.stockExpenses||entry.stock_expenses)||0, earnings: Number(entry.earnings)||0 }); },
    clearDailyEntries: function(){ return clearStore('daily_entries'); },
    // End-of-Day
    getAllEndOfDay: function(){ return getAllFrom('end_of_day_data'); },
    getEndOfDayByDate: function(date){ return getByKey('end_of_day_data', String(date)); },
    putEndOfDay: function(d){ return putOne('end_of_day_data', { date: String(d.date), cashInDrawer: Number(d.cashInDrawer||d.cash_in_drawer)||0, stockCheckDone: !!d.stockCheckDone, debtPaymentsDone: !!d.debtPaymentsDone, finished: !!d.finished, recordedSales: Number(d.recordedSales||d.recorded_sales)||0, actualSales: Number(d.actualSales||d.actual_sales)||0, salesDiff: Number(d.salesDiff||d.sales_diff)||0, profit: Number(d.profit)||0, expenses: Number(d.expenses)||0, netProfit: Number(d.netProfit||d.net_profit)||0 }); },
    clearEndOfDay: function(){ return clearStore('end_of_day_data'); },
    deleteSale: function(id){ return deleteByKey('specific_sales', id); },
    clearSales: function(){ return clearStore('specific_sales'); },
    getAllTransactions: function(){ return getAllFrom('debt_transactions'); },
    getTransactionsByDebtId: function(debtId){
      return openDB().then(function(db){
        return new Promise(function(res,rej){
          var tx=db.transaction('debt_transactions','readonly');
          var req=tx.objectStore('debt_transactions').index('debtId').getAll(Number(debtId)||debtId);
          req.onsuccess=function(){ res(req.result||[]); };
          req.onerror=function(){ rej(req.error); };
        });
      });
    },
    putTransaction: function(txRow){ return putOne('debt_transactions', { id: Number(txRow.id)||txRow.id||Date.now(), debtId: Number(txRow.debtId||txRow.debt_id)||0, type: String(txRow.type||'debt'), description: txRow.description||null, amount: Number(txRow.amount)||0, timestamp: Number(txRow.timestamp)||Date.now() }); },
    putTransactions: function(arr){ var self=this; return Promise.all((arr||[]).map(function(r){ return self.putTransaction(r); })); },
    clearTransactions: function(){ return clearStore('debt_transactions'); },
    // App Meta
    getMeta: getMeta,
    putMeta: putMeta,
    getSettings: function(){ return getMeta('settings'); },
    putSettings: function(v){ return putMeta('settings', v); },
    getHistory: function(){ return getMeta('history').then(function(v){ return Array.isArray(v)?v:[]; }); },
    putHistory: function(v){ return putMeta('history', Array.isArray(v)?v:[]); },
    getDayState: function(){
      return Promise.all([getMeta('dayOpen'),getMeta('dayDate'),getMeta('dayArchived'),getMeta('todayExpenses'),getMeta('todayEarnings')]).then(function(vals){
        return { dayOpen: !!vals[0], dayDate: vals[1]||'', dayArchived: !!vals[2], todayExpenses: Number(vals[3])||0, todayEarnings: Number(vals[4])||0 };
      });
    },
    putDayState: function(s){
      return Promise.all([putMeta('dayOpen', !!s.dayOpen), putMeta('dayDate', String(s.dayDate||'')), putMeta('dayArchived', !!s.dayArchived), putMeta('todayExpenses', Number(s.todayExpenses)||0), putMeta('todayEarnings', Number(s.todayEarnings)||0)]);
    },
    getExpenseLog: function(){ return getMeta('expenseLog').then(function(v){ return Array.isArray(v)?v:[]; }); },
    putExpenseLog: function(v){ return putMeta('expenseLog', Array.isArray(v)?v:[]); },
    // Bulk
    exportAll: function(){
      var stores=['products','specific_sales','customer_debts','debt_payments','debt_transactions','expenses','daily_entries','end_of_day_data','restock_log','sms_log','app_meta'];
      var out={};
      var p=Promise.resolve();
      stores.forEach(function(name){
        p=p.then(function(){ return getAllFrom(name).then(function(rows){ out[name]=rows; }); });
      });
      return p.then(function(){ out._meta={ exportedAt: new Date().toISOString(), dbVersion: DB_VERSION }; return out; });
    },
    clearAll: function(){
      var stores=['products','specific_sales','customer_debts','debt_payments','debt_transactions','expenses','daily_entries','end_of_day_data','restock_log','sms_log','app_meta'];
      var p=Promise.resolve();
      stores.forEach(function(s){ p=p.then(function(){ return clearStore(s); }); });
      return p;
    },
    // Legacy bridge — mirrors app.js saveState/loadState
    saveState: function(state){
      if(!state||typeof state!=='object') return Promise.resolve();
      var tasks=[];
      if(Array.isArray(state.products)) tasks.push(putMany('products', state.products.map(normalizeProduct)));
      if(Array.isArray(state.sales)) tasks.push(putMany('specific_sales', state.sales.map(normalizeSale)));
      if(Array.isArray(state.debts)){
        var debtsOnly = state.debts.map(function(d){ var nd=normalizeDebt(d); return { id: nd.id, customerName: nd.customerName, amount: nd.amount, remainingBalance: nd.remainingBalance, createdAt: nd.createdAt, creditLimit: nd.creditLimit, phoneNumber: nd.phoneNumber, smsOptIn: nd.smsOptIn==null?null:(nd.smsOptIn?1:0)}; });
        tasks.push(clearStore('customer_debts').then(function(){ return putMany('customer_debts', debtsOnly); }));
        var allTxs=[];
        state.debts.forEach(function(d){
          if(Array.isArray(d.transactions)) d.transactions.forEach(function(tx){
            allTxs.push({ id: Number(tx.id)||Date.now()+Math.floor(Math.random()*10000), debtId: Number(d.id)||0, type: tx.type||'debt', description: tx.description||null, amount: Number(tx.amount)||0, timestamp: Number(tx.timestamp)||Date.now() });
          });
        });
        if(allTxs.length) tasks.push(clearStore('debt_transactions').then(function(){ return putMany('debt_transactions', allTxs); }));
      }
      if(Array.isArray(state.history)){
        tasks.push(putMeta('history', state.history));
        var eodRows = state.history.map(function(h){ return { date: String(h.date||''), cashInDrawer: Number(h.cashInDrawer)||0, stockCheckDone: !!h.stockCheckDone, debtPaymentsDone: !!h.debtPaymentsDone, finished: !!h.finished, recordedSales: Number(h.recordedSales)||0, actualSales: Number(h.actualSales)||0, salesDiff: Number(h.salesDiff)||0, profit: Number(h.profit)||0, expenses: Number(h.expenses)||0, netProfit: Number(h.netProfit)||0 }; });
        tasks.push(clearStore('end_of_day_data').then(function(){ return putMany('end_of_day_data', eodRows); }));
      }
      if(Array.isArray(state.expenseLog)){
        tasks.push(putMeta('expenseLog', state.expenseLog));
        tasks.push(putMany('expenses', state.expenseLog.map(normalizeExpense)));
      }
      if(state.settings) tasks.push(putMeta('settings', state.settings));
      tasks.push(putMeta('dayOpen', !!state.dayOpen));
      tasks.push(putMeta('dayDate', String(state.dayDate||'')));
      tasks.push(putMeta('dayArchived', !!state.dayArchived));
      tasks.push(putMeta('todayExpenses', Number(state.todayExpenses)||0));
      tasks.push(putMeta('todayEarnings', Number(state.todayEarnings)||0));
      try {
        if(global.localStorage){
          global.localStorage.setItem(LS_PREFIX+'settings', JSON.stringify(state.settings));
          global.localStorage.setItem(LS_PREFIX+'products', JSON.stringify(state.products||[]));
          global.localStorage.setItem(LS_PREFIX+'sales', JSON.stringify(state.sales||[]));
          global.localStorage.setItem(LS_PREFIX+'debts', JSON.stringify(state.debts||[]));
          global.localStorage.setItem(LS_PREFIX+'history', JSON.stringify(state.history||[]));
          global.localStorage.setItem(LS_PREFIX+'dayOpen', JSON.stringify(!!state.dayOpen));
          global.localStorage.setItem(LS_PREFIX+'dayDate', JSON.stringify(String(state.dayDate||'')));
          global.localStorage.setItem(LS_PREFIX+'dayArchived', JSON.stringify(!!state.dayArchived));
          global.localStorage.setItem(LS_PREFIX+'todayExpenses', JSON.stringify(Number(state.todayExpenses)||0));
          global.localStorage.setItem(LS_PREFIX+'todayEarnings', JSON.stringify(Number(state.todayEarnings)||0));
          global.localStorage.setItem(LS_PREFIX+'expenseLog', JSON.stringify(state.expenseLog||[]));
        }
      } catch(_){ }
      return Promise.all(tasks).then(function(){});
    },
    loadState: function(){
      return Promise.all([getAllFrom('products'), getAllFrom('specific_sales'), getAllFrom('customer_debts'), getAllFrom('debt_transactions'), getMeta('history'), getMeta('settings'), getMeta('dayOpen'), getMeta('dayDate'), getMeta('dayArchived'), getMeta('todayExpenses'), getMeta('todayEarnings'), getMeta('expenseLog')]).then(function(results){
        var products=results[0], sales=results[1], debts=results[2], txs=results[3], history=results[4], settings=results[5], dayOpen=results[6], dayDate=results[7], dayArchived=results[8], todayExpenses=results[9], todayEarnings=results[10], expenseLog=results[11];
        var idbEmpty = !products.length && !sales.length && !debts.length;
        if(idbEmpty){
          try {
            if(global.localStorage){
              var lsProducts = global.localStorage.getItem(LS_PREFIX+'products');
              if(lsProducts) return null;
            }
          } catch(_){}
        }
        var txByDebt={};
        (txs||[]).forEach(function(tx){ var k=String(tx.debtId); (txByDebt[k]=txByDebt[k]||[]).push({ id: tx.id, debtId: tx.debtId, type: tx.type, description: tx.description, amount: tx.amount, timestamp: tx.timestamp }); });
        var debtsWithTx = (debts||[]).map(function(d){
          var nd=normalizeDebt(d);
          nd.transactions = txByDebt[String(nd.id)]||[];
          if(nd.smsOptIn!=null) nd.smsOptIn = !!nd.smsOptIn;
          return nd;
        });
        return {
          settings: settings||null,
          products: (products||[]).map(normalizeProduct),
          sales: (sales||[]).map(normalizeSale),
          debts: debtsWithTx,
          history: Array.isArray(history)?history:[],
          dayOpen: !!dayOpen,
          dayDate: dayDate||'',
          dayArchived: !!dayArchived,
          todayExpenses: Number(todayExpenses)||0,
          todayEarnings: Number(todayEarnings)||0,
          expenseLog: Array.isArray(expenseLog)?expenseLog.map(normalizeExpense):[]
        };
      });
    }
  };

  // ── Migration LS -> IDB ─────────────────────────────────
  function migrateFromLocalStorage(){
    try {
      function getJSON(key, fallback){
        try { var v=global.localStorage.getItem(LS_PREFIX+key); return v==null?fallback:JSON.parse(v); } catch(_){ return fallback; }
      }
      var settings=getJSON('settings', null);
      var products=getJSON('products', []);
      var sales=getJSON('sales', []);
      var debts=getJSON('debts', []);
      var history=getJSON('history', []);
      var dayOpen=getJSON('dayOpen', false);
      var dayDate=getJSON('dayDate', '');
      var dayArchived=getJSON('dayArchived', false);
      var todayExpenses=getJSON('todayExpenses', 0);
      var todayEarnings=getJSON('todayEarnings', 0);
      var expenseLog=getJSON('expenseLog', []);
      var state={ settings:settings, products:products, sales:sales, debts:debts, history:history, dayOpen:dayOpen, dayDate:dayDate, dayArchived:dayArchived, todayExpenses:todayExpenses, todayEarnings:todayEarnings, expenseLog:expenseLog };
      return TindaDB.saveState(state).then(function(){
        try { console.log('[TindaDB] migration complete:', { products: products.length, sales: sales.length, debts: debts.length }); } catch(_){}
      });
    } catch(e){ return Promise.reject(e); }
  }

  try { TindaDB.init().catch(function(e){ console.warn('[TindaDB] init failed', e); readyResolve(null); }); } catch(e){ try{ readyResolve(null);}catch(_){ } }
  global.TindaDB = TindaDB;
  try { global.PRODUCT_CATEGORIES = CATEGORIES.slice(); global.PRODUCT_SUBCATEGORIES = JSON.parse(JSON.stringify(SUBCATEGORIES)); } catch(_){}

})(typeof window !== 'undefined' ? window : this);
