// ── TindaGo — Pre-Order Customer Page — App Logic ──
// Vanilla JS. Mirrors backoffice patterns (no deps beyond supabase CDN client
// from config.js). Handles: URL parse, store header, product list via RPC,
// cart, payment method, submit to pre_orders, temp-id receipt.
//
// DEMO MODE (?store=<uid>&demo=1): renders a hardcoded product list and
// simulates the submit locally — NO database write. Receipt gets a DEMO badge.

'use strict';

// ── Small DOM helpers (match backoffice style) ──
function $(id) { return document.getElementById(id); }
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function peso(n) {
    var v = Number(n) || 0;
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Temp ID generation: TGO- + 5 chars from an unambiguous alphabet ──
var TEMP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
function randomTempId() {
    var out = '';
    for (var i = 0; i < 5; i++) {
        out += TEMP_ALPHABET.charAt(Math.floor(Math.random() * TEMP_ALPHABET.length));
    }
    return 'TGO-' + out;
}

// Demo products used only when ?demo=1 is present. Mirrors the shape returned
// by get_public_products (id, name, unit, price, quantity, package_size, brand).
var DEMO_PRODUCTS = [
    { id: 'demo-p1', name: 'Instant Noodles',  unit: 'pack',   price: 12.00, quantity: 50,  package_size: '60g x1', brand: 'Brand A' },
    { id: 'demo-p2', name: 'Canned Sardines',  unit: 'can',    price: 30.00, quantity: 30,  package_size: '155g',   brand: 'Brand B' },
    { id: 'demo-p3', name: 'Bottled Water',    unit: 'bottle', price: 20.00, quantity: 100, package_size: '500ml',  brand: 'Brand C' },
    { id: 'demo-p4', name: 'Bath Soap',        unit: 'bar',    price: 15.00, quantity: 40,  package_size: '90g',    brand: 'Brand D' }
];

// ── App state ──
var state = {
    storeUid: null,
    demo: false,
    storeName: 'TindaGo Store',
    storeAddress: '',
    products: [],        // visible product list (stock > 0)
    cart: {},            // productId -> qty
    paymentMethod: 'cash',
    submitted: false
};

// Quick lookup by product id
function getProduct(id) {
    for (var i = 0; i < state.products.length; i++) {
        if (String(state.products[i].id) === String(id)) return state.products[i];
    }
    return null;
}

function cartQty(id) { return state.cart[String(id)] || 0; }
function cartCount() {
    var n = 0;
    for (var k in state.cart) { if (state.cart[k] > 0) n++; }
    return n;
}
function cartTotal() {
    var sum = 0;
    for (var k in state.cart) {
        var p = getProduct(k);
        if (p) sum += (p.price || 0) * state.cart[k];
    }
    return sum;
}

// ── Render ──
function renderHeader() {
    $('storeName').textContent = state.storeName || 'TindaGo Store';
    $('storeAddress').textContent = state.storeAddress || '';
    var badge = $('demoBadge');
    if (badge) {
        if (state.demo) badge.classList.add('visible');
        else badge.classList.remove('visible');
    }
}

function renderProducts() {
    var list = $('productList');
    if (!state.products.length) {
        list.innerHTML = '<div class="empty-state">No items available right now. Please check back soon.</div>';
        return;
    }
    var html = '';
    for (var i = 0; i < state.products.length; i++) {
        var p = state.products[i];
        var qty = Number(p.quantity) || 0;
        var out = qty <= 0;
        var inCart = cartQty(p.id);
        html +=
            '<div class="product-card' + (out ? ' out' : '') + '">' +
                '<div class="product-info">' +
                    '<div class="product-name">' + esc(p.name) + '</div>' +
                    '<div class="product-meta">' +
                        (p.brand ? esc(p.brand) + ' · ' : '') +
                        (p.package_size ? esc(p.package_size) + ' · ' : '') +
                        esc(p.unit || 'item') +
                    '</div>' +
                    '<div class="product-stock">' + (out ? 'Out of stock' : qty + ' in stock') + '</div>' +
                '</div>' +
                '<div class="product-right">' +
                    '<div class="product-price">' + peso(p.price) + '</div>' +
                    (out
                        ? '<div class="btn-add disabled">Sold out</div>'
                        : inCart > 0
                            ? '<div class="stepper" data-id="' + esc(p.id) + '">' +
                                '<button type="button" class="step-btn" data-step="-1" aria-label="Decrease">−</button>' +
                                '<span class="step-qty">' + inCart + '</span>' +
                                '<button type="button" class="step-btn" data-step="1" aria-label="Increase">+</button>' +
                              '</div>'
                            : '<button type="button" class="btn-add" data-add="' + esc(p.id) + '">Add</button>')
                '</div>' +
            '</div>';
    }
    list.innerHTML = html;
}

function renderSummary() {
    var count = cartCount();
    $('summaryCount').textContent = count + ' item' + (count === 1 ? '' : 's');
    $('summaryTotal').textContent = peso(cartTotal());
    var btn = $('btnCheckout');
    if (btn) {
        if (count === 0) {
            btn.disabled = true;
            btn.classList.add('disabled');
            btn.textContent = 'Add items to order';
        } else {
            btn.disabled = false;
            btn.classList.remove('disabled');
            btn.textContent = 'Place Order ' + (state.demo ? '(DEMO)' : '') + ' · ' + peso(cartTotal());
        }
    }
}

function rerender() {
    renderProducts();
    renderSummary();
}

// Add/remove from cart (respect stock)
function addToCart(id) {
    var p = getProduct(id);
    if (!p) return;
    var max = Math.floor(Number(p.quantity) || 0);
    var cur = cartQty(id);
    if (cur >= max) return; // at stock cap
    state.cart[String(id)] = cur + 1;
    rerender();
}
function removeFromCart(id) {
    state.cart[String(id)] = Math.max(0, cartQty(id) - 1);
    if (state.cart[String(id)] === 0) delete state.cart[String(id)];
    rerender();
}

// ── Payment method ──
function selectPayment(method) {
    state.paymentMethod = method;
    var seg = $('paymentSeg');
    if (!seg) return;
    var btns = seg.querySelectorAll('.pay-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('active', btns[i].getAttribute('data-pay') === method);
    }
}

// ── Submit ──
function buildOrderPayload(tempId) {
    var items = [];
    for (var k in state.cart) {
        var qty = state.cart[k];
        if (qty <= 0) continue;
        var p = getProduct(k);
        if (!p) continue;
        items.push({
            id: String(p.id),
            name: p.name,
            unit: p.unit || 'item',
            price: Math.round((Number(p.price) || 0) * 100) / 100,
            qty: qty
        });
    }
    return {
        id: Date.now(),                       // bigint PK half; per-device unique
        user_id: state.storeUid,              // the STORE owner (pre_orders FK)
        temp_id: tempId,
        items_json: JSON.stringify(items),
        total_amount: Math.round(cartTotal() * 100) / 100,
        payment_method: state.paymentMethod,
        status: 'pending',
        customer_note: ($('customerNote').value || '').trim(),
        created_at: Date.now(),
        expires_at: Date.now() + 24 * 60 * 60 * 1000   // 24h default
    };
}

async function submitPreOrder() {
    state.submitted = true;
    $('checkoutPanel').classList.add('hidden');
    $('receiptPanel').classList.remove('hidden');
    $('receiptStatus').textContent = 'Saving your order…';

    var tempId = randomTempId();

    if (state.demo) {
        // Demo: simulate a short delay, no DB write.
        setTimeout(function () {
            showReceipt(buildOrderPayload(tempId), true);
        }, 700);
        return;
    }

    // Real mode: insert into pre_orders (anonymous INSERT is allowed by RLS policy)
    try {
        var payload = buildOrderPayload(tempId);
        var res = await sb.from('pre_orders').insert([payload]).select('temp_id, id');
        if (res.error) throw new Error(res.error.message);
        showReceipt(payload, false);
    } catch (e) {
        console.error('submitPreOrder:', e);
        $('receiptStatus').textContent = 'Sorry, we couldn\u2019t save your order. Please try again.';
        $('receiptStatus').className = 'receipt-status error';
        state.submitted = false;
        setTimeout(function () {
            $('checkoutPanel').classList.remove('hidden');
            $('receiptPanel').classList.add('hidden');
        }, 2500);
    }
}

function showReceipt(order, isDemo) {
    $('receiptTempId').textContent = order.temp_id;
    $('receiptStore').textContent = state.storeName;

    var lines = '';
    var items = [];
    try { items = JSON.parse(order.items_json || '[]'); } catch (_) { items = []; }
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var qty = Number(it.qty);
        var price = Number(it.price) || 0;
        var amount = qty > 0 ? price * qty : null; // null => don't fabricate ₱0.00
        lines += '<div class="receipt-line">' +
            '<span>' + esc(it.qty) + '× ' + esc(it.name) + '</span>' +
            '<span>' + (amount == null ? '—' : peso(amount)) + '</span>' +
        '</div>';
    }
    $('receiptItems').innerHTML = lines;
    $('receiptTotal').textContent = peso(order.total_amount);
    $('receiptMethod').textContent = String(order.payment_method || 'cash').toUpperCase();
    $('receiptTime').textContent = new Date(order.created_at).toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    $('receiptStatus').textContent = isDemo
        ? 'DEMO order — not saved to the store'
        : 'Order received! Show this Temp ID to the cashier.';
    $('receiptStatus').className = 'receipt-status' + (isDemo ? ' demo' : ' success');

    if (isDemo) {
        var badge = document.createElement('span');
        badge.className = 'demo-badge visible';
        badge.textContent = 'DEMO';
        var tempIdEl = $('receiptTempId');
        if (tempIdEl) tempIdEl.parentNode.appendChild(badge);
    }
}

// ── Copy Temp ID ──
function copyTempId() {
    var val = $('receiptTempId').textContent;
    function done() {
        $('copyBtn').textContent = 'Copied!';
        setTimeout(function () { $('copyBtn').textContent = 'Copy'; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(done).catch(function () { fallbackCopy(val); done(); });
    } else {
        fallbackCopy(val); done();
    }
}
function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
}

// ── Init ──
async function init() {
    var url = parsePreorderUrl();
    state.storeUid = url.storeUid;
    state.demo = url.demo;

    if (!state.storeUid) {
        $('appView').classList.add('hidden');
        $('errorView').classList.remove('hidden');
        return;
    }

    // Wire static UI
    renderSummary();
    selectPayment('cash');
    $('paymentSeg').addEventListener('click', function (e) {
        var btn = e.target.closest('.pay-btn');
        if (btn) selectPayment(btn.getAttribute('data-pay'));
    });
    $('productList').addEventListener('click', function (e) {
        var add = e.target.closest('[data-add]');
        if (add) { addToCart(add.getAttribute('data-add')); return; }
        var step = e.target.closest('[data-step]');
        if (step) {
            var id = step.closest('.stepper').getAttribute('data-id');
            if (Number(step.getAttribute('data-step')) > 0) addToCart(id); else removeFromCart(id);
            return;
        }
    });
    $('btnCheckout').addEventListener('click', function () {
        if (cartCount() === 0 || state.submitted) return;
        submitPreOrder();
    });
    $('copyBtn').addEventListener('click', copyTempId);
    $('btnNewOrder').addEventListener('click', function () { window.location.reload(); });

    if (state.demo) {
        state.storeName = 'Demo Store';
        state.storeAddress = 'Sample address for demo mode';
        state.products = DEMO_PRODUCTS.slice();
        renderHeader();
        renderProducts();
        renderSummary();
        return;
    }

    // Real store
    var profile = await fetchStoreProfile(state.storeUid);
    if (profile && profile.store_name) {
        state.storeName = profile.store_name;
        state.storeAddress = profile.address || '';
    }
    var all = await fetchPublicProducts(state.storeUid);
    state.products = all.filter(function (p) { return Number(p.quantity) > 0; });
    renderHeader();
    renderProducts();
    renderSummary();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init().catch(console.error); });
} else {
    init().catch(console.error);
}

