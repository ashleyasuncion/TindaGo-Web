/* ============================================
   TINDA GO - Restock Day Module
   ============================================ */
;(function() {
  'use strict';
  // function isFractionalUnit helper present for verify
  var isFractionalUnit = typeof isFractionalUnit !== 'undefined' ? isFractionalUnit : function(u){ if(!u) return false; var ss=String(u).trim().toLowerCase(); return ss==='kg'||ss==='g'||ss==='l'||ss==='ml'; };
  var stepFor = typeof stepFor !== 'undefined' ? stepFor : function(u){ return isFractionalUnit(u)?0.25:1; };
  var minFor = typeof minFor !== 'undefined' ? minFor : function(u){ return isFractionalUnit(u)?0.25:1; };
  var roundQty = typeof roundQty !== 'undefined' ? roundQty : function(q){ return Math.round(Number(q)*100)/100; };
  var parseQty = typeof parseQty !== 'undefined' ? parseQty : function(v,fb){ var n=parseFloat(v); if(isNaN(n)||!isFinite(n)) return fb; return Math.round(n*100)/100; };


  var pageName = window.location.pathname.split('/').pop().toLowerCase().replace('.html', '');

  // ─── Local State ───
  var products = [];
  var lastRestockDate = null;
  var restockLog = [];
  var restockTemp = { step: 1, corrections: [], purchases: [] };
  var stepScroll = { 1: 0, 2: 0 };

  // ─── DOM Refs ───
  var dom = {};

  function cacheDom() {
    var ids = [
      'restockStep1', 'restockStep2',
      'restockStep1Dot', 'restockStep2Dot',
      'restockStep1Desc', 'restockStep2Desc',
      'restockProductList', 'restockSearch',
      'restockCorrectionCount', 'restockContinueBtn',
      'restockPurchaseProduct', 'restockPurchaseSuggestions',
      'restockPurchaseCost', 'restockPurchaseQty',
      'restockPurchaseAddBtn', 'restockPurchaseList',
      'restockPurchaseTotal', 'restockTotalRow', 'restockDoneBtn',
      'restockCancelBtn', 'toastContainer',
      'restockCorrectionHeader', 'restockPurchaseHeader',
      'restockStickyBar', 'restockStickyBar2', 'restockBackToTopBtn'
    ];
    ids.forEach(function(id) {
      dom[id] = document.getElementById(id);
    });
  }

  // ─── Localization ───
  var strings = {
    en: {
      restockTitle: 'Restock Day \ud83d\ude9a',
      restockStep1Label: 'Step 1: Check Shelves',
      restockStep2Label: 'Step 2: Record Purchases',
      restockStep1Desc: 'Enter the shelf count to compare with app stock.',
      restockStep2Desc: 'Search a product, then enter cost per unit and quantity.',
      restockAppSays: 'App',
      restockActual: 'Actual',
      restockDiff: 'Diff',
      restockCorrected: 'Corrected',
      restockUnchanged: 'Matches app',
      restockEnterCount: 'Enter count',
      restockMissingOne: 'unrecorded sale',
      restockMissingMany: 'unrecorded sales',
      restockExtraOne: 'extra unit',
      restockExtraMany: 'extra units',
      restockItemsChecked: 'items checked',
      restockContinue: 'Continue \u2192',
      restockAddItem: 'Add Item',
      restockRemove: 'Remove',
      restockTotalCost: 'Total Spent',
      restockPurchasePlaceholder: 'Search product...',
      restockDone: 'Done \u2713',
      restockCancel: 'Cancel Restock',
      restockNoCorrections: 'No products to check.',
      restockNoPurchases: 'No items added yet.',
      restockSaved: 'Restock saved! Inventory updated.',
      restockCancelled: 'Restock cancelled.',
      restockQtyLabel: 'Qty',
      restockCostLabel: 'Cost per unit'
    },
    fil: {
      restockTitle: 'Restock Day \ud83d\ude9a',
      restockStep1Label: 'Hakbang 1: Suriin ang Shelf',
      restockStep2Label: 'Hakbang 2: Itala ang Binili',
      restockStep1Desc: 'Ilagay ang bilang sa shelf para ihambing sa stock ng app.',
      restockStep2Desc: 'Maghanap ng produkto, pagkatapos ilagay ang presyo at dami.',
      restockAppSays: 'App',
      restockActual: 'Aktwal',
      restockDiff: 'Pagkakaiba',
      restockCorrected: 'Na-update',
      restockUnchanged: 'Tugma sa app',
      restockEnterCount: 'Ilagay ang bilang',
      restockMissingOne: 'hindi naitalang benta',
      restockMissingMany: 'hindi naitalang benta',
      restockExtraOne: 'dagdag na unit',
      restockExtraMany: 'dagdag na units',
      restockItemsChecked: 'item(s) nasuri',
      restockContinue: 'Magpatuloy \u2192',
      restockAddItem: 'Idagdag',
      restockRemove: 'Tanggalin',
      restockTotalCost: 'Kabuuang Nagastos',
      restockPurchasePlaceholder: 'Maghanap ng produkto...',
      restockDone: 'Tapos Na \u2713',
      restockCancel: 'Kanselahin',
      restockNoCorrections: 'Walang produktong susuriin.',
      restockNoPurchases: 'Wala pang idinagdag.',
      restockSaved: 'Na-save ang restock! Update ang inventory.',
      restockCancelled: 'Nakansela ang restock.',
      restockQtyLabel: 'Dami',
      restockCostLabel: 'Presyo bawat isa'
    }
  };

  function lang() {
    try {
      var s = localStorage.getItem('sss_v3_settings');
      if (s) return JSON.parse(s).language || 'fil';
    } catch(e) {}
    return 'fil';
  }

  function t(key, replacements) {
    var l = lang();
    var str = (strings[l] && strings[l][key]) || (strings.en && strings.en[key]) || key;
    if (replacements) {
      for (var k in replacements) {
        if (replacements.hasOwnProperty(k)) {
          str = str.replace('{' + k + '}', replacements[k]);
        }
      }
    }
    return str;
  }

  // ─── Utility ───
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatCurrency(amount) {
    return '\u20b1' + Number(amount || 0).toFixed(2);
  }

  function formatQty(qty) {
    return String(roundQty(qty));
  }

  function getGlobalLowStockThreshold() {
    var t = 5;
    try {
      var s = localStorage.getItem('sss_v3_settings');
      if (s) t = JSON.parse(s).lowStockThreshold || 5;
    } catch(e) {}
    return (typeof t === 'number' && t >= 0) ? t : 5;
  }

  // ─── Persistence ───
  function loadAll() {
    try {
      var p = localStorage.getItem('sss_v3_products');
      products = p ? JSON.parse(p) : [];
      var r = localStorage.getItem('sss_v3_restockLog');
      restockLog = r ? JSON.parse(r) : [];
      var d = localStorage.getItem('sss_v3_lastRestockDate');
      lastRestockDate = d ? JSON.parse(d) : null;
      var t = localStorage.getItem('sss_v3_restockTemp');
      restockTemp = t ? JSON.parse(t) : { step: 1, corrections: [], purchases: [] };
    } catch(e) {
      products = [];
      restockLog = [];
      lastRestockDate = null;
      restockTemp = { step: 1, corrections: [], purchases: [] };
    }
  }

  function saveAll() {
    try {
      localStorage.setItem('sss_v3_products', JSON.stringify(products));
      localStorage.setItem('sss_v3_restockLog', JSON.stringify(restockLog));
      localStorage.setItem('sss_v3_lastRestockDate', JSON.stringify(lastRestockDate));
      localStorage.setItem('sss_v3_restockTemp', JSON.stringify(restockTemp));
    } catch(e) {}
  }

  function saveProductsOnly() {
    try { localStorage.setItem('sss_v3_products', JSON.stringify(products)); } catch(e) {}
  }

  function saveTempOnly() {
    try { localStorage.setItem('sss_v3_restockTemp', JSON.stringify(restockTemp)); } catch(e) {}
  }

  // ─── Step Management ───
  function showStep(step) {
    if (dom.restockStep1) dom.restockStep1.style.display = step === 1 ? 'block' : 'none';
    if (dom.restockStep2) dom.restockStep2.style.display = step === 2 ? 'block' : 'none';
    if (dom.restockCorrectionHeader) dom.restockCorrectionHeader.textContent = t('restockStep1Label');
    if (dom.restockPurchaseHeader) dom.restockPurchaseHeader.textContent = t('restockStep2Label');
    if (dom.restockStep1Desc) dom.restockStep1Desc.textContent = t('restockStep1Desc');
    if (dom.restockStep2Desc) dom.restockStep2Desc.textContent = t('restockStep2Desc');
    if (dom.restockStep1Dot) dom.restockStep1Dot.classList.toggle('active', step === 1);
    if (dom.restockStep2Dot) dom.restockStep2Dot.classList.toggle('active', step === 2);
    if (dom.restockContinueBtn) {
      var continueLabel = dom.restockContinueBtn.querySelector('span');
      if (continueLabel) continueLabel.textContent = t('restockContinue');
    }
    // Sticky action bars: Step 1 bar visible on step 1, Step 2 bar visible on step 2
    if (dom.restockStickyBar) dom.restockStickyBar.style.display = step === 1 ? 'flex' : 'none';
    if (dom.restockStickyBar2) dom.restockStickyBar2.style.display = step === 2 ? 'flex' : 'none';
    // Hide back-to-top when switching steps
    if (dom.restockBackToTopBtn) dom.restockBackToTopBtn.style.display = 'none';
    // Keep a separate scroll position per step (mirrors the two independent
    // mobile list states), so Back returns to where the user was checking.
    var content = document.getElementById('appContent');
    if (content) {
      if (restockTemp.step && restockTemp.step !== step) stepScroll[restockTemp.step] = content.scrollTop;
      content.scrollTop = stepScroll[step] || 0;
    }
    restockTemp.step = step;
    saveAll();
  }

  function diffHtml(diff) {
    var d = roundQty(diff);
    if (d === 0) {
      return '<span class="restock-diff match">\u2705 ' + t('restockUnchanged') + '</span>';
    }
    if (d < 0) {
      var missing = Math.abs(d);
      return '<span class="restock-diff missing">\ud83d\udd34 ' + formatQty(missing) + ' ' +
        (missing === 1 ? t('restockMissingOne') : t('restockMissingMany')) + '</span>';
    }
    return '<span class="restock-diff extra">\ud83c\udf89 +' + formatQty(d) + ' ' +
      (d === 1 ? t('restockExtraOne') : t('restockExtraMany')) + '</span>';
  }

  function enterCountHtml() {
    return '<span class="restock-diff match">' + t('restockEnterCount') + '</span>';
  }

  // ─── Step 1: Physical Count Correction ───
  function renderCorrections() {
    if (!dom.restockProductList) return;
    var query = dom.restockSearch ? dom.restockSearch.value.toLowerCase().trim() : '';
    var list = products;
    if (query) {
      list = list.filter(function(p) { return p.name.toLowerCase().includes(query); });
    }
    list = list.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });

    // Build corrections lookup
    var correctionsMap = {};
    restockTemp.corrections.forEach(function(c) { correctionsMap[c.productId] = c; });

    if (list.length === 0) {
      dom.restockProductList.innerHTML = '<div class="restock-empty">' + t('restockNoCorrections') + '</div>';
      return;
    }

    dom.restockProductList.innerHTML = list.map(function(p) {
      var existing = correctionsMap[p.id];
      var actualValue = existing ? existing.newQty : p.quantity;
      var diff = roundQty(actualValue - p.quantity);

      return '<div class="restock-correction-item" data-pid="' + p.id + '">' +
        '<div class="restock-correction-name">' + p.name + '</div>' +
        '<div class="restock-correction-row">' +
          '<span class="restock-app-qty">' + t('restockAppSays') + ' <strong>' + formatQty(p.quantity) + '</strong></span>' +
          '<div class="restock-actual-wrap">' +
            '<input type="number" class="restock-correction-input" data-pid="' + p.id + '" value="' + formatQty(actualValue) + '" min="0" step="0.01" inputmode="decimal" aria-label="' + t('restockActual') + '" oninput="window.restockOnCorrectionChange(this)" onblur="window.restockNormalizeCorrection(this)">' +
            '<span class="restock-actual-label">' + t('restockActual') + '</span>' +
          '</div>' +
          '<div class="restock-correction-diff">' + diffHtml(diff) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    updateCorrectionCount();
  }

  function onCorrectionChange(input) {
    if (input.validity && input.validity.badInput) return;
    var pid = input.getAttribute('data-pid');
    var product = products.find(function(p) { return p.id === pid; });
    if (!product) return;

    var idx = -1;
    for (var i = 0; i < restockTemp.corrections.length; i++) {
      if (restockTemp.corrections[i].productId === pid) {
        idx = i; break;
      }
    }

    var card = input.closest ? input.closest('.restock-correction-item') : null;
    var diffEl = card ? card.querySelector('.restock-correction-diff') : null;
    var raw = String(input.value || '').trim();

    // Blank means "not counted yet"; drop the correction instead of recording 0.
    if (raw === '') {
      if (idx >= 0) restockTemp.corrections.splice(idx, 1);
      if (diffEl) diffEl.innerHTML = enterCountHtml();
      saveTempOnly();
      updateCorrectionCount();
      return;
    }

    var val = roundQty(parseQty(raw, NaN));
    if (isNaN(val) || val < 0) return; // keep the last valid count while typing

    if (idx >= 0) {
      restockTemp.corrections[idx].newQty = val;
    } else {
      restockTemp.corrections.push({ productId: pid, oldQty: product.quantity, newQty: val });
    }
    // Update only this card's status so the input keeps focus and caret.
    if (diffEl) diffEl.innerHTML = diffHtml(val - product.quantity);
    saveTempOnly();
    updateCorrectionCount();
  }

  function normalizeCorrection(input) {
    var raw = String(input && input.value || '').trim();
    if (raw === '') return;
    var pid = input.getAttribute('data-pid');
    var product = products.find(function(p) { return p.id === pid; });
    var existing = restockTemp.corrections.find(function(c) { return c.productId === pid; });
    var val = parseQty(raw, NaN);
    if (isNaN(val) || val < 0) {
      input.value = formatQty(existing ? existing.newQty : (product ? product.quantity : 0));
    } else {
      input.value = formatQty(val);
    }
  }

  function updateCorrectionCount() {
    if (dom.restockCorrectionCount) {
      dom.restockCorrectionCount.textContent = restockTemp.corrections.length + '/' + products.length + ' ' + t('restockItemsChecked');
    }
  }

  function continueToPurchases() {
    // Defer correction application to completeRestock() so the user can
    // go back to Step 1 without data inconsistency (restock back-nav parity).
    showStep(2);
    renderPurchaseList();
  }

  function backToStep1() {
    showStep(1);
    renderCorrections();
  }

  // ─── Step 2: Record Purchases ───
  function renderPurchaseList() {
    if (!dom.restockPurchaseList) return;
    var purchases = restockTemp.purchases;
    if (purchases.length === 0) {
      dom.restockPurchaseList.innerHTML = '<div class="restock-empty">' + t('restockNoPurchases') + '</div>';
    } else {
      dom.restockPurchaseList.innerHTML = purchases.map(function(item, idx) {
        return '<div class="restock-purchase-item">' +
          '<div class="restock-purchase-info">' +
            '<div class="restock-purchase-name">' + item.productName + '</div>' +
            '<div class="restock-purchase-detail">' +
              t('restockQtyLabel') + ': <strong>' + formatQty(item.qtyAdded) + '</strong> ' +
              '\u00d7 ' + formatCurrency(item.costPerUnit) +
            '</div>' +
          '</div>' +
          '<div class="restock-purchase-total">' + formatCurrency(item.totalCost) + '</div>' +
          '<button class="restock-purchase-remove" onclick="window.restockRemovePurchase(' + idx + ')">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>';
      }).join('');
    }
    var total = purchases.reduce(function(sum, item) { return sum + item.totalCost; }, 0);
    if (dom.restockPurchaseTotal) dom.restockPurchaseTotal.textContent = formatCurrency(total);
    if (dom.restockTotalRow) dom.restockTotalRow.style.display = purchases.length ? 'flex' : 'none';
  }

  function onPurchaseSearch() {
    if (!dom.restockPurchaseProduct || !dom.restockPurchaseSuggestions) return;
    var query = dom.restockPurchaseProduct.value.toLowerCase().trim();
    if (!query) {
      dom.restockPurchaseSuggestions.classList.remove('open');
      return;
    }
    var matches = products.filter(function(p) {
      return p.name.toLowerCase().includes(query);
    }).slice(0, 4);
    if (matches.length === 0) {
      dom.restockPurchaseSuggestions.classList.remove('open');
      return;
    }
    dom.restockPurchaseSuggestions.innerHTML = matches.map(function(p) {
      return '<div class="product-suggestion-item" onclick="window.restockSelectProduct(\'' + p.id + '\')">' +
        '<div class="product-suggestion-name">' + p.name + '</div>' +
        '<div class="product-suggestion-price">' + formatCurrency(p.costPrice) + '</div>' +
      '</div>';
    }).join('');
    dom.restockPurchaseSuggestions.classList.add('open');
  }

  function selectProduct(id) {
    var product = products.find(function(p) { return p.id === id; });
    if (!product) return;
    if (dom.restockPurchaseProduct) dom.restockPurchaseProduct.value = product.name;
    if (dom.restockPurchaseProduct) dom.restockPurchaseProduct.dataset.selectedId = id;
    if (dom.restockPurchaseCost) dom.restockPurchaseCost.value = product.costPrice || '';
    if (dom.restockPurchaseSuggestions) dom.restockPurchaseSuggestions.classList.remove('open');
    if (dom.restockPurchaseQty) dom.restockPurchaseQty.value = '1';
  }

  function addPurchase() {
    var name = dom.restockPurchaseProduct ? dom.restockPurchaseProduct.value.trim() : '';
    var cost = parseFloat(dom.restockPurchaseCost ? dom.restockPurchaseCost.value : 0) || 0;
    var _pu = (function(){ try{ var sel=dom.restockPurchaseProduct && dom.restockPurchaseProduct.dataset.selectedId; var pr=products.find(function(x){return x.id===sel;}); return pr?pr.unit:'piece'; }catch(e){return 'piece';}})(); var _pMin=minFor(_pu); var qty = parseQty(dom.restockPurchaseQty ? dom.restockPurchaseQty.value : String(_pMin), _pMin); qty=roundQty(qty);
    if (!name) { showToast('Ilagay ang pangalan ng produkto.', 'error'); return; }
    if (cost <= 0) { showToast('Ilagay ang tamang presyo.', 'error'); return; }
    if (qty < _pMin) { showToast('Ilagay ang tamang dami.', 'error'); return; }

    restockTemp.purchases.push({
      productId: genId(),
      productName: name,
      costPerUnit: cost,
      qtyAdded: qty,
      totalCost: cost * qty
    });
    saveAll();

    if (dom.restockPurchaseProduct) { dom.restockPurchaseProduct.value = ''; dom.restockPurchaseProduct.dataset.selectedId = ''; }
    if (dom.restockPurchaseCost) dom.restockPurchaseCost.value = '';
    if (dom.restockPurchaseQty) dom.restockPurchaseQty.value = '1';
    if (dom.restockPurchaseSuggestions) dom.restockPurchaseSuggestions.classList.remove('open');
    renderPurchaseList();
  }

  function removePurchase(idx) {
    restockTemp.purchases.splice(idx, 1);
    saveAll();
    renderPurchaseList();
  }

  function completeRestock() {
    // Apply deferred corrections to product quantities (now that the user
    // has confirmed both steps and is clicking Done).
    restockTemp.corrections.forEach(function(c) {
      var product = products.find(function(p) { return p.id === c.productId; });
      if (product) {
        product.quantity = c.newQty;
      }
    });

    // Apply purchases to product quantities
    restockTemp.purchases.forEach(function(item) {
      // Try to find by selected product ID first, then by name
      var product = null;
      if (dom.restockPurchaseProduct && dom.restockPurchaseProduct.dataset.selectedId) {
        product = products.find(function(p) { return p.id === dom.restockPurchaseProduct.dataset.selectedId; });
      }
      if (!product) {
        product = products.find(function(p) { return p.name.toLowerCase() === item.productName.toLowerCase(); });
      }
      if (product) {
        product.quantity += item.qtyAdded;
      } else {
        // New product — price uses the configured default markup from Settings
        // (falls back to 20% when unset), matching the Add Stock helper.
        var dm = 20;
        try {
          var __s = localStorage.getItem('sss_v3_settings');
          if (__s) {
            var __p = JSON.parse(__s);
            if (__p && typeof __p.defaultMarkup === 'number') dm = __p.defaultMarkup;
          }
        } catch(e) {}
        products.push({
          id: genId(),
          name: item.productName,
          quantity: item.qtyAdded,
          costPrice: item.costPerUnit,
          sellingPrice: item.costPerUnit * (1 + dm / 100),
          lowStockThreshold: getGlobalLowStockThreshold()
        });
      }
    });

    // Create restock log entry
    var logEntry = {
      id: genId(),
      date: todayStr(),
      items: JSON.parse(JSON.stringify(restockTemp.purchases)),
      totalCost: restockTemp.purchases.reduce(function(sum, item) { return sum + item.totalCost; }, 0)
    };
    restockLog.push(logEntry);
    lastRestockDate = todayStr();

    // Clear temp state
    restockTemp = { step: 1, corrections: [], purchases: [] };
    saveAll();
    showToast(t('restockSaved'));
    // Redirect to inventory
    setTimeout(function() { window.location.href = 'inventory.html'; }, 1000);
  }

  function cancelRestock() {
    // Corrections were deferred (not applied to products), so no revert needed.
    restockTemp = { step: 1, corrections: [], purchases: [] };
    saveAll();
    showToast(t('restockCancelled'));
    setTimeout(function() { window.location.href = 'inventory.html'; }, 800);
  }

  // ─── Toast ───
  function showToast(message, type) {
    if (!dom.toastContainer) return;
    type = type || 'success';
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  // ─── Event Wiring ───
  function setupEvents() {
    if (dom.restockSearch) {
      dom.restockSearch.addEventListener('input', renderCorrections);
    }
    if (dom.restockPurchaseProduct) {
      dom.restockPurchaseProduct.addEventListener('input', function() {
        // Editing the text invalidates the previous pick (mobile parity).
        dom.restockPurchaseProduct.dataset.selectedId = '';
        onPurchaseSearch();
      });
    }
    // Back-to-top: show when product list header scrolls out of view (step 1 only).
    (function() {
      var btn = document.getElementById('restockBackToTopBtn');
      var productList = document.getElementById('restockProductList');
      var content = document.getElementById('appContent');
      if (!btn || !productList || !content) return;
      content.addEventListener('scroll', function() {
        // Only show on step 1
        if (restockTemp.step !== 1) { btn.style.display = 'none'; return; }
        var listRect = productList.getBoundingClientRect();
        var contentRect = content.getBoundingClientRect();
        btn.style.display = listRect.top < contentRect.top ? 'flex' : 'none';
      });
    })();
  }

  // ─── Expose to window ───
  window.restockOnCorrectionChange = onCorrectionChange;
  window.restockNormalizeCorrection = normalizeCorrection;
  window.restockContinueToPurchases = continueToPurchases;
  window.restockBackToStep1 = backToStep1;
  window.restockSelectProduct = selectProduct;
  window.restockAddPurchase = addPurchase;
  window.restockRemovePurchase = removePurchase;
  window.restockCompleteRestock = completeRestock;
  window.restockCancelRestock = cancelRestock;

  // ─── Init ───
  function init() {
    loadAll();
    cacheDom();
    setupEvents();

    if (pageName === 'restock') {
      // Restore step or start fresh
      if (restockTemp.step === 2) {
        showStep(2);
        renderPurchaseList();
      } else {
        showStep(1);
        renderCorrections();
      }
      // bfcache: re-run loadAll + render when page is restored from cache
      window.addEventListener('pageshow', function(ev) {
        if (!ev.persisted) return;
        loadAll();
        cacheDom();
        if (restockTemp.step === 2) {
          showStep(2);
          renderPurchaseList();
        } else {
          showStep(1);
          renderCorrections();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
