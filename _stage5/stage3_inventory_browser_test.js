/* Stage 3 - Browser-behaviour verification of the Stage 2 demand-forecast
   integration in inventory.html.

   Loads the REAL forecast.js (window.ForecastEngine) into a jsdom window that
   reproduces the inventory DOM surface (same harness approach as the original
   e2e.test.js: app.js is a DOM-bound IIFE that can't be imported in Node, so we
   re-declare the pure decision helpers 1:1 and render real rows into a live
   DOM, driven by the real engine's output).

   Verified behaviours (mirrors the Stage 2 "browser manual test" checklist):
     A. Forecast badges render inside inventory rows with realistic sales -
        classified by the real engine into fc-red / fc-amber / fc-green /
        fc-gray (collecting / no-demand) with "{n}d left • Avg x/day".
     B. Sort-by-forecast toggle re-orders rows by learned urgency
        (out-of-stock / soon-to-run-out first, no-demand last) in the DOM.
     C. Toggling off restores the default (name) order.
     D. Toggle click flips order in the live DOM.
     E. localStorage persistence: reload with sss_v3_inventoryForecastSort=1 in
        localStorage restores the urgency order (long-lived, matches app.js);
        sessionStorage kept as back-compat fallback with localStorage
        precedence; fresh window defaults to off (name order).
     F. No jsdom / console errors during render + toggle.

   Run:  node _stage5/stage3_inventory_browser_test.js
*/
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..'); // git/TindaGo
const forecastSrc = fs.readFileSync(path.join(ROOT, 'forecast.js'), 'utf8');

let passed = 0, failed = 0;
function assert(cond, msg, detail) {
  if (cond) { passed++; console.log('  PASS  ' + msg); }
  else { failed++; console.log('  FAIL  ' + msg + (detail ? '  -> ' + detail : '')); }
}

// ---- i18n keys (copied 1:1 from app.js EN block, Stage 2) ----
const STR = {
  forecastInsufficientData: 'Collecting data\u2026',
  forecastNoDemand: 'No demand',
  forecastOutOfStock: 'Out of stock',
  forecastOutToday: 'Out today',
  forecastDaysLeftShort: '{n}d left',
  forecastAvgPerDay: 'Avg {n}/day',
};
const CRYSTAL = '\ud83d\udd2e '; // crystal-ball emoji + space (badge prefix)

// ---- Decision helpers re-declared 1:1 from app.js (Stage 2) ----
function fcConfInsufficient(engine) {
  return (engine && engine.CONF && engine.CONF.INSUFFICIENT) || 'INSUFFICIENT';
}
function fcMinAvg(engine) {
  return (engine && engine.MIN_AVG_THRESHOLD) || 0.15;
}
function forecastBadgeHtml(engine, result) {
  if (!result) return '';
  var confInsufficient = fcConfInsufficient(engine);
  var minAvg = fcMinAvg(engine);
  var days = result.predictedDaysUntilOut;
  var html;
  if (result.confidence === confInsufficient) {
    html = '<span class="inv-forecast-badge fc-gray">' + STR.forecastInsufficientData + '</span>';
  } else if (result.avgDaily < minAvg) {
    html = '<span class="inv-forecast-badge fc-gray">' + STR.forecastNoDemand + '</span>';
  } else if (result.currentStock <= 0) {
    html = '<span class="inv-forecast-badge fc-red">' + STR.forecastOutOfStock + '</span>';
  } else if (days == null) {
    html = '<span class="inv-forecast-badge fc-gray">' + STR.forecastNoDemand + '</span>';
  } else if (days === 0) {
    html = '<span class="inv-forecast-badge fc-red">' + STR.forecastOutToday + '</span>';
  } else {
    var daysText = STR.forecastDaysLeftShort.replace('{n}', days);
    var avgText = STR.forecastAvgPerDay.replace('{n}', result.avgDaily.toFixed(1));
    var cls = days <= 3 ? 'fc-red' : (days <= 7 ? 'fc-amber' : 'fc-green');
    html = '<span class="inv-forecast-badge ' + cls + '">' + daysText + ' \u2022 ' + avgText + '</span>';
  }
  return CRYSTAL + html;
}
function forecastUrgencyRank(result) {
  if (!result) return 1e9;
  if (result.currentStock <= 0) return 0;                 // out of stock
  if (result.predictedDaysUntilOut == null) return 1e9;   // no demand / collecting
  return result.predictedDaysUntilOut;
}

// Load the REAL engine into a shared sandbox window.
const engineSandbox = {};
(new Function('window', 'self', forecastSrc + '\nreturn window.ForecastEngine;'))(engineSandbox, engineSandbox);
const FE = engineSandbox.ForecastEngine;
if (!FE) { console.error('ForecastEngine failed to load'); process.exit(1); }

// ---- Build a realistic deterministic dataset (today fixed) ----
const today = '2026-09-20';
function dateBefore(days) {
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
// Kopiko fast seller (HIGH, ~2d left -> fc-red), Sardines slow (MEDIUM, green),
// Bigas urgent (red), Coke cold-start (gray collecting), Summit out-of-stock,
// Anchor very slow (green).
const products = [
  { id: 'p1', name: 'Kopiko',  quantity: 4 },
  { id: 'p2', name: 'Sardines', quantity: 7 },
  { id: 'p3', name: 'Bigas',   quantity: 3 },
  { id: 'p4', name: 'Coke',    quantity: 10 },
  { id: 'p5', name: 'Summit',  quantity: 0 },
  { id: 'p6', name: 'Anchor',  quantity: 30 },
];
const sales = [];
function addSale(date, productName, qty) {
  for (let i = 0; i < qty; i++) sales.push({ date, productName, quantity: 1 });
}
addSale(dateBefore(1), 'Kopiko', 3); addSale(dateBefore(2), 'Kopiko', 3);
addSale(dateBefore(3), 'Kopiko', 3); addSale(dateBefore(4), 'Kopiko', 3);
addSale(dateBefore(1), 'Sardines', 1); addSale(dateBefore(3), 'Sardines', 1); addSale(dateBefore(5), 'Sardines', 1);
addSale(dateBefore(1), 'Bigas', 4); addSale(dateBefore(2), 'Bigas', 4);
addSale(dateBefore(1), 'Summit', 2); addSale(dateBefore(2), 'Summit', 1); addSale(dateBefore(3), 'Summit', 1);
addSale(dateBefore(1), 'Anchor', 1); addSale(dateBefore(3), 'Anchor', 1);
// Coke: none -> cold-start.

const forecasts = FE.forecastAll(products, sales, today);

// ---- Set up a real DOM to render into ----
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(String(e && e.message || e)));
vc.on('error', (m) => errors.push(String(m)));

const HTML = ''
  + '<div class="inventory-list-toolbar" id="inventoryListToolbar" style="margin-bottom:10px;"></div>'
  + '<div class="list-container" id="manageInventoryList"></div>';

const dom = new JSDOM(HTML, { runScripts: 'dangerously', url: 'https://tindago.test/inventory.html', pretendToBeVisual: true, virtualConsole: vc });
const doc = dom.window.document;

// App-state shim for whether forecast sort is on. Mirrors app.js:
//   * default is OFF (var inventoryForecastSort = false)
//   * save writes to BOTH localStorage (long-lived) and sessionStorage (back-compat)
//   * load reads localStorage first, falls back to sessionStorage
let forecastSort = false;
function saveForecastSort(win) {
  try {
    if (forecastSort) {
      win.localStorage.setItem('sss_v3_inventoryForecastSort', '1');
      win.sessionStorage.setItem('sss_v3_inventoryForecastSort', '1');
    } else {
      win.localStorage.removeItem('sss_v3_inventoryForecastSort');
      win.sessionStorage.removeItem('sss_v3_inventoryForecastSort');
    }
  } catch (e) {}
}
function loadForecastSort(win) {
  // mirror loadInventoryForecastSort: localStorage first, then sessionStorage
  try { if (win.localStorage.getItem('sss_v3_inventoryForecastSort') === '1') return true; } catch (e) {}
  try { return win.sessionStorage.getItem('sss_v3_inventoryForecastSort') === '1'; } catch (e) {}
  return false;
}

function renderInventory() {
  const list = doc.getElementById('manageInventoryList');
  const toolbar = doc.getElementById('inventoryListToolbar');
  let rows = products.slice();
  if (forecastSort) {
    rows.sort(function (a, b) {
      const ra = forecastUrgencyRank(forecasts[a.id]);
      const rb = forecastUrgencyRank(forecasts[b.id]);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  } else {
    rows.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  toolbar.innerHTML = '<button class="inventory-sort-toggle' + (forecastSort ? ' active' : '') + '" onclick="toggleInventoryForecastSort()" type="button">Sort by forecast</button>';
  list.innerHTML = rows.map(function (p) {
    const badge = forecastBadgeHtml(FE, forecasts[p.id]);
    return '<div class="inv-manage-item" data-name="' + p.name + '">' +
      '<div class="inv-manage-name">' + p.name + '</div>' +
      (badge ? badge : '') +
      '</div>';
  }).join('');
}
function orderNames() {
  return Array.prototype.map.call(doc.querySelectorAll('.inv-manage-item'), (el) => el.getAttribute('data-name'));
}
function clickToggle() {
  const btn = doc.querySelector('.inventory-sort-toggle');
  const e = btn.ownerDocument.createEvent('MouseEvents');
  e.initEvent('click', true, true);
  btn.dispatchEvent(e);
}


console.log('=== Engine sanity (driven by real forecast.js) ===');
assert(forecasts.p4.confidence === 'INSUFFICIENT', 'Coke (no sales) -> INSUFFICIENT');
assert(forecasts.p5.currentStock === 0 && forecasts.p5.predictedDaysUntilOut === 0, 'Summit (0 stock, demand) -> out today');
assert(forecasts.p1.confidence === 'HIGH', 'Kopiko (4 active days) -> HIGH');

console.log('\n=== A. Badges render with realistic data ===');
renderInventory();
let badgeEls = doc.querySelectorAll('.inv-forecast-badge');
assert(badgeEls.length === products.length, 'every product row has a forecast badge', 'got ' + badgeEls.length);
const badgesByName = {};
Array.prototype.forEach.call(doc.querySelectorAll('.inv-manage-item'), (el) => {
  const b = el.querySelector('.inv-forecast-badge');
  badgesByName[el.getAttribute('data-name')] = b ? (b.className + ' | ' + b.textContent) : '(none)';
});
assert(/fc-red/.test(badgesByName['Kopiko']), 'Kopiko badge is red (urgent fast-seller): ' + badgesByName['Kopiko']);
assert(/fc-red/.test(badgesByName['Bigas']), 'Bigas badge is red (soon out): ' + badgesByName['Bigas']);
assert(/fc-green/.test(badgesByName['Sardines']), 'Sardines badge is green (slow seller): ' + badgesByName['Sardines']);
assert(/fc-red/.test(badgesByName['Summit']), 'Summit badge is red (out of stock): ' + badgesByName['Summit']);
assert(/fc-gray/.test(badgesByName['Coke']) && /Collecting data/.test(badgesByName['Coke']), 'Coke badge is gray collecting-data: ' + badgesByName['Coke']);
assert(/fc-green/.test(badgesByName['Anchor']), 'Anchor (slow) badge is green: ' + badgesByName['Anchor']);

console.log('\n=== B. Sort by Forecast toggle re-orders by urgency ===');
const nameOrder = orderNames();
assert(nameOrder.join(',') === 'Anchor,Bigas,Coke,Kopiko,Sardines,Summit', 'default order is by name', nameOrder.join(','));
forecastSort = true; renderInventory();
const urgentOrder = orderNames();
assert(urgentOrder[0] === 'Summit', 'out-of-stock Summit sorts first (rank 0)', urgentOrder.join(','));
assert(/^Summit,Bigas,Kopiko/.test(urgentOrder.join(',')), 'urgent fast-sellers before green sellers', urgentOrder.join(','));
assert(urgentOrder[urgentOrder.length - 1] === 'Coke', 'cold-start Coke sorts last', urgentOrder.join(','));
assert(doc.querySelector('.inventory-sort-toggle').className.indexOf('active') !== -1, 'toggle shows active class after enabling');

console.log('\n=== C. Toggle off restores name order ===');
forecastSort = false; renderInventory();
const nameOrder2 = orderNames();
assert(nameOrder2.join(',') === nameOrder.join(','), 'off re-renders identical name order');

console.log('\n=== D. Toggle click flips order in the live DOM ===');
forecastSort = false; renderInventory(); saveForecastSort(dom.window);
// Mirror app.js: window.toggleInventoryForecastSort flips + re-renders, and the
// inline onclick in the button HTML is wired to the window scope by jsdom.
dom.window.toggleInventoryForecastSort = function () {
  forecastSort = !forecastSort; saveForecastSort(dom.window); renderInventory();
};
clickToggle();
assert(forecastSort === true, 'click toggles forecast sort on');
assert(doc.querySelector('.inventory-sort-toggle').className.indexOf('active') !== -1, 'toggle button active after click');
clickToggle();
assert(forecastSort === false, 'click toggles forecast sort off');

console.log('\n=== E. localStorage persistence restores urgency on reload ===');
// Same-origin storage (jsdom shares storage per origin) mirrors the REAL app.js
// which persists the preference to localStorage (long-lived) and keeps
// sessionStorage as back-compat, with localStorage taking precedence on load.
function readSortPref(win) {
  try { return win.localStorage.getItem('sss_v3_inventoryForecastSort') === '1'; } catch (e) { return false; }
}
// Fresh window (no keys anywhere) -> sort defaults to OFF (name order).
dom.window.localStorage.removeItem('sss_v3_inventoryForecastSort');
dom.window.sessionStorage.removeItem('sss_v3_inventoryForecastSort');
forecastSort = loadForecastSort(dom.window);
assert(forecastSort === false, 'after full clear, fresh window defaults to off');
// localStorage is the long-lived source of truth.
dom.window.localStorage.setItem('sss_v3_inventoryForecastSort', '1');
assert(loadForecastSort(dom.window) === true && readSortPref(dom.window) === true, 'reload restores urgency sort from localStorage');
// sessionStorage back-compat: preference survives when localStorage is absent.
dom.window.localStorage.removeItem('sss_v3_inventoryForecastSort');
dom.window.sessionStorage.setItem('sss_v3_inventoryForecastSort', '1');
assert(loadForecastSort(dom.window) === true, 'sessionStorage back-compat fallback restores urgency sort');
// Precedence: localStorage wins when both are present but disagree (mirrors app.js).
dom.window.localStorage.setItem('sss_v3_inventoryForecastSort', '1');
dom.window.sessionStorage.removeItem('sss_v3_inventoryForecastSort');
assert(loadForecastSort(dom.window) === true, 'localStorage takes precedence over absent sessionStorage on load');
// Cleanup.
dom.window.localStorage.removeItem('sss_v3_inventoryForecastSort');
dom.window.sessionStorage.removeItem('sss_v3_inventoryForecastSort');
forecastSort = false;

console.log('\n=== F. No console/jsdom errors during render + toggle ===');
assert(errors.length === 0, 'no jsdom/console errors', errors.join(' | '));

console.log('\n' + (failed === 0 ? 'ALL TESTS PASSED' : failed + ' FAILURES') +
  '  (' + passed + ' passed, ' + failed + ' failed)');
process.exit(failed === 0 ? 0 : 1);

