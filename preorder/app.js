// ── TindaGo — Pre-Order Customer Page — App Logic ──
// Vanilla JS. Mirrors backoffice patterns (no deps beyond supabase CDN client
// from config.js). Handles: URL parse, store header, product list via RPC,
// cart, payment method, submit to pre_orders, temp-id receipt.
//
// DEMO MODE (?store=<uid>&demo=1): renders a hardcoded product list and
// simulates the submit locally — NO database write. Receipt gets a DEMO badge.

'use strict';

// ── Ensure an anonymous Supabase session exists ──
// Supabase requires a JWT for any write operation. Without a prior login,
// an anonymous JWT ensures inserts carry the required Authorization header.
async function ensureAnonSession() {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
            const { data, error } = await sb.auth.signInAnonymously();
            if (error) {
                console.error('Anonymous sign-in failed:', error);
            } else {
                console.info('Anonymous session established');
            }
        }
    } catch (e) {
        console.error('ensureAnonSession threw:', e);
    }
}

// Call it immediately so all later inserts carry the JWT.
ensureAnonSession();

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
// by get_public_products (id, name, unit, price, quantity, package_size, brand,
// category, subcategory — both added 2026-10-11 so the category/subcategory
// drill-down demos).
var DEMO_PRODUCTS = [
    { id: 'demo-p1', name: 'Instant Noodles',  unit: 'pack',   price: 12.00, quantity: 50,  package_size: '60g x1', brand: 'Brand A', category: 'instant_dry_goods', subcategory: 'instant_noodles' },
    { id: 'demo-p2', name: 'Canned Sardines',  unit: 'can',    price: 30.00, quantity: 30,  package_size: '155g',   brand: 'Brand B', category: 'canned_goods', subcategory: 'sardines' },
    { id: 'demo-p3', name: 'Bottled Water',    unit: 'bottle', price: 20.00, quantity: 100, package_size: '500ml',  brand: 'Brand C', category: 'beverages', subcategory: 'bottled_water' },
    { id: 'demo-p4', name: 'Bath Soap',        unit: 'bar',    price: 15.00, quantity: 40,  package_size: '90g',    brand: 'Brand D', category: 'personal_care', subcategory: 'bath_soap' }
];

// ── App state ──
var state = {
    storeUid: null,
    demo: false,
    storeName: 'TindaGo Store',
    storeAddress: '',
    products: [],        // visible product list (stock > 0)
    isLoading: false,    // true while products are being fetched from Supabase
    cart: {},            // productId -> qty
    paymentMethod: 'cash',
    submitted: false
};

// ── Landing page (entry gate shown after QR scan, before catalog) ──
var LANDING_HINT_DEFAULT = "Tap Shop Now to view this store's menu and order ahead for pickup.";
function enterLanding(profile) {
    var nameEl = $('landingStoreName');
    var addrEl = $('landingStoreAddress');
    var chip = $('landingChip');
    var chipText = $('landingChipText');
    var btn = $('landingButton');
    var hint = $('landingHint');

    if (nameEl) nameEl.textContent = state.storeName || 'TindaGo Store';
    if (addrEl) addrEl.textContent = state.storeAddress || '';

    // Status chip tied to is_preorder_enabled (no profile yet / true = Live)
    var enabled = !profile || profile.is_preorder_enabled !== false;
    if (chip && chipText) {
        chip.className = enabled ? 'landing-chip on' : 'landing-chip paused';
        chipText.textContent = enabled ? 'Live' : 'Paused';
    }
    if (hint) {
        hint.textContent = enabled ? LANDING_HINT_DEFAULT
            : "This store isn't accepting online orders right now. Please visit the store directly.";
    }

    if (btn) {
        btn.disabled = !enabled;
        btn.textContent = enabled ? 'Shop Now' : 'Pre-ordering is off';
        btn.onclick = function () {
            if (btn.disabled) return;
            exitLanding();
        };
    }

    $('landingView').classList.remove('hidden');
    $('appView').classList.add('hidden');
    $('errorView').classList.add('hidden');
}

function exitLanding() {
    $('landingView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    renderHeader();
    buildCategoryOptions(state.products);
    applyFilter();
    renderSummary();
}

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

function buildProductCardHTML(p) {
    var qty = Number(p.quantity) || 0;
    var out = qty <= 0;
    var inCart = cartQty(p.id);
    return '<div class="product-card' + (out ? ' out' : '') + '">' +
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
                    : '<button type="button" class="btn-add" data-add="' + esc(p.id) + '">Add</button>') +
        '</div>' +
    '</div>';
}

function renderList(products) {
    var list = $('productList');
    if (!list) return;
    var html = '';
    for (var i = 0; i < products.length; i++) {
        html += buildProductCardHTML(products[i]);
    }
    list.innerHTML = html || '<div class="empty-state">No items available right now. Please check back soon.</div>';
}

function renderProducts() {
    var list = $('productList');
    if (state.isLoading) {
        list.innerHTML =
            '<div class="skeleton"><div class="skeleton-left"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div><div class="skeleton-right"><div class="skeleton-box"></div></div></div>' +
            '<div class="skeleton"><div class="skeleton-left"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div><div class="skeleton-right"><div class="skeleton-box"></div></div></div>' +
            '<div class="skeleton"><div class="skeleton-left"><div class="skeleton-line w60"></div><div class="skeleton-line w40"></div></div><div class="skeleton-right"><div class="skeleton-box"></div></div></div>';
        return;
    }
    renderList(state.products);
    buildCategoryOptions(state.products);
}

// ── Search / category filter ──
// CategorySearchField parity (morphing control like inventory). The dropdown
// is built from the RPC's real `category` values after products are fetched;
// category state flows from the bound variables below, not a DOM select.
var selectedCategory = '';
var selectedSubcategory = '';
var filterState = { query: '', category: '', subcategory: '' };

function applyFilter() {
    var search = $('searchInput');
    if (search) filterState.query = (search.value || '').trim().toLowerCase();
    filterState.category = selectedCategory || '';
    filterState.subcategory = selectedSubcategory || '';
    var filtered = state.products.filter(function (p) {
        var matchesCat = !filterState.category || String(p.category || '') === filterState.category;
        var matchesSub = !filterState.subcategory || String(p.subcategory || '') === filterState.subcategory;
        var matchesQuery = !filterState.query ||
            (p.name || '').toLowerCase().indexOf(filterState.query) !== -1;
        return matchesCat && matchesSub && matchesQuery;
    });
    if (filtered.length === 0 && (filterState.query || filterState.category || filterState.subcategory)) {
        var list = $('productList');
        if (list) list.innerHTML = '<div class="empty-state">No items match your search.</div>';
        return;
    }
    renderList(filtered);
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
            btn.textContent = 'Review order ' + (state.demo ? '(DEMO)' : '') + ' · ' + peso(cartTotal());
        }
    }
}

function rerender() {
    applyFilter();
    renderSummary();
}

// ── CategorySearchField (self-contained port of category_search.js bind) ──
// preorder/ deploys independently to Vercel, so it cannot require the shared
// category_search.js served from the repo root. The bind logic is inlined here,
// backed by the selectedCategory / selectedSubcategory globals above.
// Taxonomy constants, mirroring the shared app.js source (git/TindaGo/app.js)
// so preorder/ stays self-contained for its standalone Vercel deployment.
var PRODUCT_CATEGORIES = [
    'pantry_staples','canned_goods','instant_dry_goods','snacks_sweets','beverages',
    'dairy_refrigerated','fresh_section','liquor_wine','personal_care','household_care',
    'baby_care','paper_sanitary'
];
var PRODUCT_SUBCATEGORIES = {
    pantry_staples:    ['rice','cooking_oil','sugar','salt','vinegar','bread'],
    canned_goods:      ['sardines','corned_beef','tuna','meat_loaf','sausage'],
    instant_dry_goods: ['instant_noodles','cup_noodles','pasta','soup_mixes'],
    snacks_sweets:     ['chips','crackers','candies','chocolates','cookies'],
    beverages:         ['coffee_mix','powdered_milk','chocolate_drink','juice','soft_drinks','bottled_water'],
    dairy_refrigerated:['cheese','butter','margarine','chilled_meats'],
    fresh_section:     ['fresh_meat','fresh_seafood','fruits','vegetables','eggs'],
    liquor_wine:       ['beer','gin','brandy','wine','cigarettes'],
    personal_care:     ['shampoo','conditioner','bath_soap','toothpaste','toothbrush','lotion','cosmetics'],
    household_care:    ['laundry','fabric_softener','dishwashing','cleaners','trash_bags','mosquito_control'],
    baby_care:         ['diapers','baby_wipes','baby_toiletries'],
    paper_sanitary:    ['tissue','paper_towels','sanitary_pads']
};
var SUB_LABELS = {
    rice:'Rice',cooking_oil:'Cooking Oil',sugar:'Sugar',salt:'Salt',vinegar:'Vinegar',bread:'Bread',
    sardines:'Sardines',corned_beef:'Corned Beef',tuna:'Tuna',meat_loaf:'Meat Loaf',sausage:'Sausage',
    instant_noodles:'Instant Noodles',cup_noodles:'Cup Noodles',pasta:'Pasta',soup_mixes:'Soup Mixes',
    chips:'Chips',crackers:'Crackers',candies:'Candies',chocolates:'Chocolates',cookies:'Cookies',
    coffee_mix:'Coffee Mix',powdered_milk:'Powdered Milk',chocolate_drink:'Chocolate Drink',juice:'Juice',soft_drinks:'Soft Drinks',bottled_water:'Bottled Water',
    cheese:'Cheese',butter:'Butter',margarine:'Margarine',chilled_meats:'Chilled Meats',
    fresh_meat:'Fresh Meat',fresh_seafood:'Fresh Seafood',fruits:'Fruits',vegetables:'Vegetables',eggs:'Eggs',
    beer:'Beer',gin:'Gin',brandy:'Brandy',wine:'Wine',cigarettes:'Cigarettes',
    shampoo:'Shampoo',conditioner:'Conditioner',bath_soap:'Bath Soap',toothpaste:'Toothpaste',toothbrush:'Toothbrush',lotion:'Lotion',cosmetics:'Cosmetics',
    laundry:'Laundry',fabric_softener:'Fabric Softener',dishwashing:'Dishwashing',cleaners:'Cleaners',trash_bags:'Trash Bags',mosquito_control:'Mosquito Control',
    diapers:'Diapers',baby_wipes:'Baby Wipes',baby_toiletries:'Baby Toiletries',
    tissue:'Tissue',paper_towels:'Paper Towels',sanitary_pads:'Sanitary Pads'
};

// Resolve the canonical *subcategory* label (human-friendly title case).
function resolveSubLabel(k) {
    var key = String(k || '');
    if (!key) return '';
    if (SUB_LABELS[key]) return SUB_LABELS[key];
    return key.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}
// Resolve which *categories* actually appear in the current product set.
// Prefer the store's real data (superset of the taxonomy); fall back to the
// canonical taxonomy when empty so the control still demos/renders.
function resolveCats() {
    var seen = {};
    (state.products || []).forEach(function (p) { if (p.category) seen[p.category] = true; });
    var found = Object.keys(seen).sort();
    return found.length ? found : PRODUCT_CATEGORIES.slice();
}
// Subcategories for a category, from either real product data or the taxonomy.
function resolveSubs(cat) {
    var seen = {};
    (state.products || []).forEach(function (p) {
        if (p.category === cat && p.subcategory) seen[p.subcategory] = true;
    });
    var found = Object.keys(seen).sort();
    if (found.length) return found;
    return (PRODUCT_SUBCATEGORIES[cat] || []).slice();
}
function resolveCatLabel(k) {
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}
function escSearch(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function categoryLabelText() {
    var c = selectedCategory || '', s = selectedSubcategory || '';
    if (s) return resolveSubLabel(s);
    if (c) return resolveCatLabel(c);
    return 'Category';
}

// Build the dropdown for one of two levels (parity with category_search.js
// render('categories') / render('subcategories') and the inventory.html script):
//   'categories'      — "All Categories" + the store's real categories
//   'subcategories'   — back header + that category's subcategories (real data
//                       when the RPC/DB provides it, else the canonical taxonomy)
function renderDropdown(level, dd) {
    if (!dd) return;
    var h = '';
    if (level === 'categories') {
        h += '<div class="category-item' + (!selectedCategory && !selectedSubcategory ? ' active' : '') +
            '" data-cat="" data-action="clear">All Categories</div>';
        resolveCats().forEach(function (c) {
            var active = (c === selectedCategory && !selectedSubcategory) ? ' active' : '';
            h += '<div class="category-item' + active + '" data-cat="' + escSearch(c) + '">' + escSearch(resolveCatLabel(c)) + '</div>';
        });
    } else {
        var cur = selectedCategory || '';
        h += '<div class="dropdown-header" data-action="back">← ' + escSearch(resolveCatLabel(cur)) + ' — Subcategories</div>';
        h += '<div class="dropdown-divider"></div>';
        var subs = resolveSubs(cur);
        if (!subs.length) {
            h += '<div class="category-item" style="opacity:.6">—</div>';
        } else {
            subs.forEach(function (s) {
                var active = (s === selectedSubcategory) ? ' active' : '';
                h += '<div class="category-item' + active + '" data-sub="' + escSearch(s) + '">' + escSearch(resolveSubLabel(s)) + '</div>';
            });
        }
    }
    dd.innerHTML = h;
}

// Back-compat alias: renders the categories level. The products argument is now
// unused — resolveCats() already prefers the real product data when available.
function buildCategoryOptions() { renderDropdown('categories', $('categoryDropdown')); }

function wireCategorySearch() {
    var sc = $('searchControl'), btn =$('categoryButton'), label =$('categoryLabel'),
        dd =$('categoryDropdown'), ab = $('actionButton'), input = $('searchInput');
    if (!sc || !btn || !dd || !ab || !input) return;

    function updLabel() {
        if (!label) return;
        label.textContent = categoryLabelText();
    }
    function openDD() {
        // Drilled into the category's subcategories when one is selected.
        if (selectedCategory && resolveSubs(selectedCategory).length) {
            renderDropdown('subcategories', dd);
        } else {
            renderDropdown('categories', dd);
        }
        dd.classList.add('open');
    }
    function closeDD() { dd.classList.remove('open'); }
    function selCat(cat) {
        selectedCategory = cat || '';
        selectedSubcategory = '';
        updLabel(); closeDD();
        // Drill into subcategories when the picked category has them (parity
        // with category_search.js selCat / inventory selectCategory).
        if (selectedCategory && resolveSubs(selectedCategory).length) {
            renderDropdown('subcategories', dd);
            dd.classList.add('open');
        }
        applyFilter();
    }
    function selSub(sub) {
        selectedSubcategory = sub || '';
        updLabel(); closeDD();
        applyFilter();
    }
    function backToCats() {
        selectedSubcategory = '';
        updLabel();
        renderDropdown('categories', dd);
        applyFilter();
    }
    function clearF() {
        selectedCategory = '';
        selectedSubcategory = '';
        updLabel(); closeDD();
        applyFilter();
    }
    function enterSM() {
        sc.classList.add('search-mode');
        closeDD();
        setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
    }
    function exitSM() {
        sc.classList.remove('search-mode');
        if (input.value.trim()) { input.value = ''; applyFilter(); }
        updLabel(); closeDD();
        try { input.blur(); } catch (e) {}
    }

    dd.addEventListener('click', function (e) {
        var t = e.target.closest('[data-cat],[data-sub],[data-action]');
        if (!t || !dd.contains(t)) return;
        e.stopPropagation();
        var c = t.getAttribute('data-cat');
        if (c !== null) { if (c === '') clearF(); else selCat(c); return; }
        var s = t.getAttribute('data-sub');
        if (s !== null) { if (s === '') selSub(''); else selSub(s); return; }
        var a = t.getAttribute('data-action');
        if (a === 'clear') clearF();
        else if (a === 'back') backToCats();
    });
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (sc.classList.contains('search-mode')) { exitSM(); return; }
        if (dd.classList.contains('open')) closeDD(); else openDD();
    });
    ab.addEventListener('click', function (e) {
        if (sc.classList.contains('search-mode')) return;
        e.stopPropagation();
        enterSM();
    });
    input.addEventListener('input', applyFilter);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') exitSM(); });
    document.addEventListener('click', function (e) { if (!sc.contains(e.target)) closeDD(); });

    buildCategoryOptions(state.products);
    updLabel();
}

// ── Stage 5 — cart review step ──
// Swap menu → review in place (single-page feel). The review panel owns the
// final Place Order; the sticky bar only gets you there.
function openReview() {
    if (cartCount() === 0 || state.submitted) return;
    $('menuSection').classList.add('hidden');
    $('checkoutPanel').classList.remove('hidden');
    $('summaryBar').classList.add('hidden');
    renderReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function closeReview() {
    $('checkoutPanel').classList.add('hidden');
    $('menuSection').classList.remove('hidden');
    $('summaryBar').classList.remove('hidden');
    renderSummary();
}
function renderReview() {
    var html = '';
    for (var k in state.cart) {
        var qty = state.cart[k];
        if (qty <= 0) continue;
        var p = getProduct(k);
        if (!p) continue;
        html +=
            '<div class="review-item">' +
                '<div class="review-item-info">' +
                    '<div class="review-item-name">' + esc(p.name) + '</div>' +
                    '<div class="review-item-price">' + peso(p.price) + ' / ' + esc(p.unit || 'item') + '</div>' +
                '</div>' +
                '<div class="review-item-right">' +
                    '<div class="stepper" data-id="' + esc(p.id) + '">' +
                        '<button type="button" class="step-btn" data-step="-1" aria-label="Decrease">−</button>' +
                        '<span class="step-qty">' + qty + '</span>' +
                        '<button type="button" class="step-btn" data-step="1" aria-label="Increase">+</button>' +
                    '</div>' +
                    '<div class="review-item-total">' + peso((p.price || 0) * qty) + '</div>' +
                '</div>' +
            '</div>';
    }
    $('reviewItems').innerHTML = html;
    $('reviewTotal').textContent = peso(cartTotal());
    var place = $('btnPlaceOrder');
    if (place) {
        if (state.submitted) {
            place.disabled = true;
            place.textContent = 'Order placed';
        } else if (cartCount() === 0) {
            place.disabled = true;
            place.textContent = 'Cart is empty';
        } else {
            place.disabled = false;
            place.textContent = 'Place Order ' + (state.demo ? '(DEMO)' : '') + ' · ' + peso(cartTotal());
        }
    }
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
    $('summaryBar').classList.add('hidden'); // review/receipt own the screen now
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
        $('receiptStatus').textContent = "Sorry, we couldn't save your order. Please try again.";
        $('receiptStatus').className = 'receipt-status error';
        state.submitted = false;
        setTimeout(function () {
            $('checkoutPanel').classList.remove('hidden');
            $('summaryBar').classList.remove('hidden');
            $('receiptPanel').classList.add('hidden');
            renderReview();
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

// ── Store-code entry (no ?store= in URL) ──
function showStoreCodeEntry(visible) {
    var el = $('errorTry');
    if (el) el.classList.toggle('visible', !!visible);
}

function wireStoreCodeEntry() {
    var input = $('storeCodeInput');
    var go = $('storeCodeGo');
    function submit() {
        var code = (input ? input.value : '').trim();
        if (!code || !code.length) { if (input) input.focus(); return; }
        // The store code is a friendly slug (e.g. TGO-MNL01). If the whole
        // ?store= or ?code= URL was pasted, extract just the identifier so the
        // redirect is clean. UUIDs keep the ?store= path; slug-looking codes use
        // ?code= (resolved via get_uid_by_slug during init).
        var m = /[?&](store|code)=([^&]+)/.exec(code);
        var params = new URLSearchParams(window.location.search);
        if (m && m[1] && m[2]) {
            var val = decodeURIComponent(m[2]);
            params.set(m[1], val);
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) {
            params.set('store', code);   // looks like a raw UUID
        } else {
            params.set('code', code);    // friendly short code
        }
        window.location.search = params.toString();
    }
    if (go) go.addEventListener('click', submit);
    if (input) {
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    }
}

// ── Init ──
async function init() {
    var url = parsePreorderUrl();
    state.storeUid = url.storeUid;
    state.demo = url.demo;

    // Short-code path: ?code=<friendly slug> resolves to the store's UUID via
    // get_uid_by_slug before any profile/products fetch. Falls through to the
    // code-entry screen when the slug is unknown.
    if (!state.storeUid && url.storeCode) {
        state.storeUid = await resolveStoreCode(url.storeCode);
        if (state.storeUid) {
            // Keep URL params readable — replace ?code with ?store for the rest
            // of the session? No: leave the ?code intact so the store's friendly
            // link stays friendly and bookmarks keep working. The resolved UID is
            // held in state. Alternatively rewrite location. Chosen: state-only.
        }
    }

    // DEV_FALLBACK: if no ?store= param in URL, try localStorage
    if (!state.storeUid) {
        var lsUid = localStorage.getItem('DEV_STORE_UID');
        if (lsUid) {
            state.storeUid = lsUid;
        }
    }

    if (!state.storeUid) {
        // Accessibility: visiting /preorder/ without ?store= shows a friendly
        // landing state instead of a hard error, so a customer can enter the
        // store code printed at the store. The store stays reachable even when
        // the owner hasn't created a site via back office — the code IS the UID.
        // Override the fallback error copy with welcome copy specific to this path
        // (mirroring the pre-ordering-off override below), so the landing reads as
        // an invitation to type a code, not as a "wrong link" error.
        var welcomeTitle = document.querySelector('#errorView .error-title');
        var welcomeText = document.querySelector('#errorView .error-text');
        if (url.storeCode && !state.storeUid) {
            // A ?code= was provided but didn't resolve — say so, not generic copy.
            if (welcomeTitle) welcomeTitle.textContent = 'Store code not found';
            if (welcomeText) welcomeText.textContent = 'We couldn\'t find a store for "' + url.storeCode + '". Check the code and try again, or enter another code below.';
        } else {
            if (welcomeTitle) welcomeTitle.textContent = 'Welcome to TindaGo';
            if (welcomeText) welcomeText.textContent = 'Enter your store code below to start your order.';
        }

        $('appView').classList.add('hidden');
        $('errorView').classList.remove('hidden');
        showStoreCodeEntry(true);
        wireStoreCodeEntry();
        return;
    }

    // Wire static UI
    renderSummary();
    selectPayment('cash');
    wireCategorySearch();
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
        openReview();
    });
    $('btnBackMenu').addEventListener('click', closeReview);
    $('btnPlaceOrder').addEventListener('click', function () {
        if (cartCount() === 0 || state.submitted) return;
        submitPreOrder();
    });
    $('reviewItems').addEventListener('click', function (e) {
        var step = e.target.closest('[data-step]');
        if (!step) return;
        var id = step.closest('.stepper').getAttribute('data-id');
        if (Number(step.getAttribute('data-step')) > 0) addToCart(id); else removeFromCart(id);
        if (cartCount() === 0) { closeReview(); return; }
        renderReview();
    });
    $('copyBtn').addEventListener('click', copyTempId);
    $('btnNewOrder').addEventListener('click', function () { window.location.reload(); });

    if (state.demo) {
        state.storeName = 'Demo Store';
        state.storeAddress = 'Sample address for demo mode';
        state.products = DEMO_PRODUCTS.slice();
        // Show landing page (pre-ordering always enabled in demo)
        enterLanding(null);
        return;
    }

    // Real store — show skeleton while fetching profile + products
    state.isLoading = true;
    renderHeader();
    renderProducts();

    var profile = await fetchStoreProfile(state.storeUid);
    if (profile && profile.store_name) {
        state.storeName = profile.store_name;
        state.storeAddress = profile.address || '';
    }

    var all = await fetchPublicProducts(state.storeUid);
    state.products = all.filter(function (p) { return Number(p.quantity) > 0; });
    state.isLoading = false;

    // Show landing page (handles pre-order enabled/disabled)
    enterLanding(profile);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init().catch(console.error); });
} else {
    init().catch(console.error);
}