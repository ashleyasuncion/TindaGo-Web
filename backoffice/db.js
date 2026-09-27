// ── TindaGo Back Office — Data Layer (Schema v2, user-scoped) ──
// Supabase PostgREST queries scoped to the authenticated user's UUID.
// Schema v2: composite PKs (user_id, id) / (user_id, date); user_id PK on
// store_settings. Companion to config.js (provides the global `sb` client).
// Every page must call DB.init(session) once after requireAuth() before any
// other DB call. `sb` must already be loaded (script order: supabase CDN ->
// config.js -> db.js on each page).

const DB = {
    _uid: null,

    // ── Initialization ──────────────────────────────────────────────
    // Call once per page after requireAuth(): caches the user UUID used
    // to scope every read and stamp every write.
    init(session) {
        if (!session || !session.user || !session.user.id) {
            throw new Error('DB.init: invalid session. Call DB.init(session) with a valid Supabase session.');
        }
        this._uid = session.user.id;
    },

    // Scoped user id. Throws a clear error instead of silently querying
    // with an undefined filter (which RLS would reject or, worse, the
    // wrong store's rows could leak if policies ever changed).
    uid() {
        if (!this._uid) {
            throw new Error('DB not initialized. Call DB.init(session) first.');
        }
        return this._uid;
    },

    // Maps a PostgREST error to a safe, UI-displayable message.
    // Never leaks raw server internals to the page.
    errMessage(context, error) {
        console.error(context + ':', error);
        if (!error) return 'Unknown database error.';
        return error.message || ('Database error (' + (error.code || 'unknown') + ').');
    },

    // ── PRODUCTS ──
    async getProducts() {
        const { data, error } = await sb
            .from('products')
            .select('*')
            .eq('user_id', this.uid())
            .order('name');
        if (error) { console.error('getProducts:', error); return []; }
        return data.map(r => ({
            id: r.id,
            name: r.name,
            quantity: r.quantity,
            costPrice: r.cost_price,
            sellingPrice: r.selling_price,
            unit: r.unit,
            lowStockThreshold: r.low_stock_threshold,
            category: r.category,
            subcategory: r.subcategory,
            brand: r.brand,
            packageSize: r.package_size
        }));
    },

    async upsertProduct(p) {
        const row = {
            user_id: this.uid(),
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            cost_price: p.costPrice,
            selling_price: p.sellingPrice,
            unit: p.unit,
            low_stock_threshold: p.lowStockThreshold,
            category: p.category || '',
            subcategory: p.subcategory || '',
            brand: p.brand || '',
            package_size: p.packageSize || ''
        };
        // Composite conflict key matches the v2 PK (user_id, id) so one
        // store's upsert can never overwrite another store's row.
        const { error } = await sb
            .from('products')
            .upsert(row, { onConflict: 'user_id,id' });
        if (error) { console.error('upsertProduct:', error); return error; }
        return null;
    },

    // ── SALES ──
    async getSales() {
        const { data, error } = await sb
            .from('specific_sales')
            .select('*')
            .eq('user_id', this.uid())
            .order('timestamp', { ascending: false });
        if (error) { console.error('getSales:', error); return []; }
        return data.map(r => ({
            id: r.id,
            date: r.date,
            description: r.description,
            amount: r.amount,
            quantity: r.quantity,
            customerName: r.customer_name,
            profit: r.profit,
            timestamp: r.timestamp,
            transactionId: r.transaction_id,
            paymentMethod: r.payment_method
        }));
    },

    // ── DEBTS ──
    async getDebts() {
        const { data, error } = await sb
            .from('customer_debts')
            .select('*')
            .eq('user_id', this.uid())
            .order('id', { ascending: false });
        if (error) { console.error('getDebts:', error); return []; }
        return data.map(r => ({
            id: r.id,
            customerName: r.customer_name,
            amount: r.amount,
            remainingBalance: r.remaining_balance,
            createdAt: r.created_at,
            creditLimit: r.credit_limit,
            phoneNumber: r.phone_number,
            smsOptIn: r.sms_opt_in
        }));
    },

    // ── DEBT PAYMENTS ──
    async getPayments() {
        const { data, error } = await sb
            .from('debt_payments')
            .select('*')
            .eq('user_id', this.uid())
            .order('timestamp', { ascending: false });
        if (error) { console.error('getPayments:', error); return []; }
        return data.map(r => ({
            id: r.id,
            debtId: r.debt_id,
            amount: r.amount,
            timestamp: r.timestamp,
            note: r.note
        }));
    },

    // ── DEBT TRANSACTIONS ──
    async getDebtTransactions() {
        const { data, error } = await sb
            .from('debt_transactions')
            .select('*')
            .eq('user_id', this.uid())
            .order('timestamp');
        if (error) { console.error('getDebtTransactions:', error); return []; }
        return data.map(r => ({
            id: r.id,
            debtId: r.debt_id,
            type: r.type,
            description: r.description,
            amount: r.amount,
            timestamp: r.timestamp
        }));
    },

    // ── EXPENSES ──
    async getExpenses() {
        const { data, error } = await sb
            .from('expenses')
            .select('*')
            .eq('user_id', this.uid())
            .order('date', { ascending: false });
        if (error) { console.error('getExpenses:', error); return []; }
        return data.map(r => ({
            id: r.id,
            date: r.date,
            category: r.category,
            amount: r.amount,
            note: r.note,
            timestamp: r.timestamp
        }));
    },

    // ── DAILY ENTRIES ──
    async getDailyEntries() {
        const { data, error } = await sb
            .from('daily_entries')
            .select('*')
            .eq('user_id', this.uid())
            .order('date', { ascending: false });
        if (error) { console.error('getDailyEntries:', error); return []; }
        return data.map(r => ({
            date: r.date,
            stockExpenses: r.stock_expenses,
            earnings: r.earnings
        }));
    },

    // ── END OF DAY (complete mapping — all 12 v2 columns) ──
    async getEndOfDay() {
        const { data, error } = await sb
            .from('end_of_day_data')
            .select('*')
            .eq('user_id', this.uid())
            .order('date', { ascending: false });
        if (error) { console.error('getEndOfDay:', error); return []; }
        return data.map(r => ({
            date: r.date,
            cashInDrawer: r.cash_in_drawer,
            stockCheckDone: r.stock_check_done,
            debtPaymentsDone: r.debt_payments_done,
            finished: r.finished,
            recordedSales: r.recorded_sales,
            actualSales: r.actual_sales,
            salesDiff: r.sales_diff,
            profit: r.profit,
            expenses: r.expenses,
            netProfit: r.net_profit
        }));
    },

    // ── RESTOCK LOG ──
    async getRestockLog() {
        const { data, error } = await sb
            .from('restock_log')
            .select('*')
            .eq('user_id', this.uid())
            .order('date', { ascending: false });
        if (error) { console.error('getRestockLog:', error); return []; }
        return data;
    },

    // ── STORE SETTINGS (user_id PK in v2 — one row per user) ──
    async getSettings() {
        // maybeSingle: a store that has never saved settings has no row yet.
        const { data, error } = await sb
            .from('store_settings')
            .select('*')
            .eq('user_id', this.uid())
            .maybeSingle();
        if (error) { console.error('getSettings:', error); return null; }
        return data;
    },

    // ── SUPPLIERS (web-only, user-scoped) ──
    async getSuppliers() {
        const { data, error } = await sb
            .from('suppliers')
            .select('*')
            .eq('user_id', this.uid())
            .order('name');
        if (error) { console.error('getSuppliers:', error); return []; }
        return data;
    },

    async addSupplier(supplier) {
        // user_id is stamped server-side from the session so a store can
        // only ever insert into its own partition (defense in depth: RLS
        // enforces the same rule on auth.uid()).
        const row = { ...supplier, user_id: this.uid() };
        const { data, error } = await sb
            .from('suppliers')
            .insert(row)
            .select()
            .single();
        if (error) { console.error('addSupplier:', error); return null; }
        return data;
    },

    async deleteSupplier(id) {
        // Dual filter: user_id first, id second. Because the v2 PK is
        // (user_id, id), the id-only predicate on its own would 400;
        // the user_id predicate scopes the delete to this store.
        const { error } = await sb
            .from('suppliers')
            .delete()
            .eq('user_id', this.uid())
            .eq('id', id);
        if (error) { console.error('deleteSupplier:', error); return error; }
        return null;
    }
};