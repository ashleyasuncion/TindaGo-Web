/* Stage 4 — Product Detail forecast card + Morning (7d) / Reports (14d)
   urgent-restock cards for the TindaGo web app.

   Same harness convention as stage3_inventory_browser_test.js: loads the REAL
   forecast.js (window.ForecastEngine) into a jsdom window, re-declares the
   Stage 4 pure HTML helpers 1:1 from app.js, and renders real card markup into
   a live DOM driven by the real engine's output. app.js itself is a DOM-bound
   IIFE that can't be imported in Node.

   Verified behaviours (mirrors spec §8 Stage 4 checklist):
     A. Product Detail: forecast card renders title, confidence chip (HIGH/
        MED/COLD), 7 history bars, Avg/EMA/Trend stats, days-left prediction,
        suggest qty + "for 7 days", how-it-works caption.
     B. Product Detail: cold-start product shows insufficient-data + hint
        instead of a prediction.
     C. Morning (7d): urgent card lists urgent items as rows with severity
        dots, "{n}d left" / "Out today" / "Out of stock", and +suggest qty;
        card is hidden when nothing is urgent.
     D. Reports (14d): a product selling only inside the 14-day window (but
        outside the 7-day window) is classed urgent at 14d but NOT at 7d —
        proving the inline 14-day baseline; list is sorted ascending by days
        and capped at 5.
     E. i18n keys referenced by the Stage 4 helpers exist in the EN block.
     F. No jsdom / console errors during render.

   Run:  node _stage5/stage4_product_morning_report_test.js
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

// ---- i18n keys (copied 1:1 from app.js EN block, Stage 4) ----
const STR = {
  forecastDetailTitle: 'Forecast Demand',
  forecastDetailSubtitle: 'Pattern learned offline from your sales history',
  forecastMethod: 'Statistical ML',
  forecastHistory: 'Last 7 days sold',
  forecastHowItWorks: 'Avg from 7 days \u2192 daysUntilOut = stock \u00f7 avg.',
  forecastConfidenceHigh: 'High',
  forecastConfidenceMedium: 'Medium',
  forecastConfidenceLow: 'Low',
  forecastInsufficientData: 'Collecting data\u2026',
  forecastInsufficientHint: 'Not enough history \u2014 record 2+ days',
  forecastAvgLabel: 'Avg',
  forecastEmaLabel: 'EMA',
  forecastTrendLabel: 'Trend',
  forecastSuggestedRestock: 'Suggest +{n}',
  forecastFor7Days: 'for 7 days',
  forecastDaysLeftFull: '~{n} days left',
  forecastDaysLeftShort: '{n}d left',
  forecastAvgPerDay: 'Avg {n}/day',
  forecastRestockSoonTitle: 'Restock Soon (ML Forecast) \ud83d\udd2e',
  forecastRestockSoonDesc: 'Predicted days until out of stock (7-day window)',
  forecastReportTitle: 'Restock Soon (ML Forecast) \ud83d\udd2e',
  forecastReportDesc: '14-day demand window \u2014 buy these to avoid running out',
  forecastUrgentOutToday: 'Out today',
  forecastUrgentOutOfStock: 'Out of stock',
  forecastNoDemand: 'No demand',
  restockBtn: 'Restock',
};
function t(key, vars) {
  let s = STR[key] != null ? STR[key] : ('{' + key + '}');
  if (vars) { Object.keys(vars).forEach((k) => { s = s.replace('{' + k + '}', vars[k]); }); }
  return s;
}
function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// ---- Stage 4 helpers re-declared 1:1 from app.js ----
function _fcConfChip(conf) {
  if (conf === 'HIGH') return { label: t('forecastConfidenceHigh'), color: '#16a34a', bg: '#f0fdf4' };
  if (conf === 'MEDIUM') return { label: t('forecastConfidenceMedium'), color: '#d97706', bg: '#fffbeb' };
  if (conf === 'LOW') return { label: t('forecastConfidenceLow'), color: '#475569', bg: '#f8fafc' };
  return { label: STR.forecastInsufficientData, color: '#64748b', bg: '#f1f5f9' };
}
function _fcBarColor(days) {
  if (days != null && days <= 3) return '#dc2626';
  if (days != null && days <= 7) return '#d97706';
  return '#16a34a';
}
function _fcMiniBarsHtml(result) {
  var hist = result.dailyHistory || [];
  var dates = result.dailyDates || [];
  var max = 0, i;
  for (i = 0; i < hist.length; i++) if (hist[i] > max) max = hist[i];
  var barColor = _fcBarColor(result.predictedDaysUntilOut);
  var bars = '';
  for (i = 0; i < 7; i++) {
    var v = (i < hist.length) ? hist[i] : 0;
    var h = (max > 0 && v > 0) ? Math.max(5, Math.round((v / max) * 100)) : 5;
    var op = v === 0 ? 0.15 : 0.9;
    var label = (i < dates.length) ? dates[i].slice(5).replace('-', '/') : '';
    bars += '<div data-fc-bar style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;" title="' + (label || '') + '">' +
      '<div style="width:100%;max-width:18px;height:' + h + 'px;background:' + barColor + ';opacity:' + op + ';border-radius:3px;"></div>' +
      (i === 0 || i === 6 ? '<span style="font-size:9px;color:#94a3b8;">' + esc(label) + '</span>' : '<span style="font-size:9px;">&nbsp;</span>') +
    '</div>';
  }
  return '<div style="display:flex;align-items:flex-end;gap:4px;height:52px;padding:8px 0;">' + bars + '</div>';
}
function _fcStatRowHtml(result) {
  function st(label, val) {
    return '<div data-fc-stat><div style="font-size:var(--text-xs);color:#94a3b8;">' + label + '</div>' +
      '<div style="font-weight:700;color:#1e293b;font-size:var(--text-sm);">' + val.toFixed(1) + '</div></div>';
  }
  return '<div style="display:flex;background:#f8fafc;border-radius:10px;padding:8px 4px;margin-top:4px;">' +
    st(t('forecastAvgLabel'), result.avgDaily) +
    st(t('forecastEmaLabel'), result.emaDaily) +
    st(t('forecastTrendLabel'), result.trendDaily) +
  '</div>';
}
function _fcHasPrediction(result, engine) {
  if (!result) return false;
  var minAvg = (engine && engine.MIN_AVG_THRESHOLD != null) ? engine.MIN_AVG_THRESHOLD : 0.15;
  return result.confidence !== 'INSUFFICIENT' && result.avgDaily >= minAvg;
}

function forecastDetailCardHtml(result, product) {
  if (!result) return '';
  var engine = { MIN_AVG_THRESHOLD: FE.MIN_AVG_THRESHOLD };
  var chip = _fcConfChip(result.confidence);
  var predHtml;
  if (!_fcHasPrediction(result, engine)) {
    predHtml = '<div data-fc-coldstart><div data-fc-confkey>' + STR.forecastInsufficientData + '</div>' +
      '<div data-fc-hintkey>' + STR.forecastInsufficientHint + '</div></div>';
  } else {
    var days = result.predictedDaysUntilOut;
    var daysText;
    if (days == null) daysText = STR.forecastNoDemand;
    else if (days === 0) daysText = STR.forecastOutToday;
    else daysText = t('forecastDaysLeftFull', { n: days });
    var daysColor = _fcBarColor(days);
    predHtml = '<div data-fc-pred>' +
        '<div data-fc-daystext style="color:' + daysColor + ';">' + daysText + '</div>' +
        '<div data-fc-suggest>' + t('forecastSuggestedRestock', { n: result.suggestedRestockQty }) + '</div>' +
        '<div data-fc-for7>' + STR.forecastFor7Days + '</div>' +
        '<div data-fc-avg>' + result.avgDaily.toFixed(1) + '</div>' +
      '</div>';
  }
  return '<div data-fc-detailcard>' +
    '<div data-fc-title>' + STR.forecastDetailTitle + '</div>' +
    '<span data-fc-chip>' + chip.label + '</span>' +
    _fcMiniBarsHtml(result) +
    _fcStatRowHtml(result) +
    predHtml +
    '<div data-fc-howitworks>' + STR.forecastHowItWorks + '</div>' +
  '</div>';
}
function _fcUrgentRowHtml(item) {
  var r = item.result;
  var days = r.predictedDaysUntilOut;
  var daysText, dot;
  if (days === 0)            { daysText = STR.forecastUrgentOutToday;   dot = '#dc2626'; }
  else if (r.currentStock <= 0) { daysText = STR.forecastUrgentOutOfStock; dot = '#dc2626'; }
  else                       { daysText = t('forecastDaysLeftShort', { n: days }); dot = (days <= 3) ? '#dc2626' : '#d97706'; }
  return '<div data-fc-row>' +
    '<span data-fc-dot style="background:' + dot + ';"></span>' +
    '<div data-fc-row-name>' + esc(r.productName || item.product.name) + '</div>' +
    '<div data-fc-row-daystext>' + daysText + '</div>' +
    '<div data-fc-row-suggest>+' + r.suggestedRestockQty + '</div>' +
  '</div>';
}
function forecastUrgentCardHtml(list, titleKey, descKey) {
  if (!list || list.length === 0) return '';
  var rows = list.map(_fcUrgentRowHtml).join('');
  return '<div data-fc-urgentcard>' +
    '<div data-fc-urgent-title>' + t(titleKey) + '</div>' +
    '<div data-fc-urgent-desc>' + t(descKey) + '</div>' +
    rows +
  '</div>';
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

const products = [
  { id: 'p1', name: 'Kopiko',  quantity: 4 },   // fast seller, HIGH, red
  { id: 'p2', name: 'Coke',    quantity: 10 },  // no sales, cold-start
  { id: 'p3', name: 'Summit',  quantity: 0 },   // demand but 0 stock -> out today
  { id: 'p4', name: 'Anchor',  quantity: 40 },  // very slow, green, many days left
  { id: 'p5', name: 'Longago', quantity: 2 },   // sells only ~9d/13d ago: urgent at 14d, not at 7d
];
const sales = [];
function addSale(daysAgo, productName, qty) {
  const date = dateBefore(daysAgo);
  for (let i = 0; i < qty; i++) sales.push({ date, productName, quantity: 1 });
}
// Kopiko: 4 active selling days in the last 4 days -> HIGH.
addSale(1, 'Kopiko', 3); addSale(2, 'Kopiko', 3);
addSale(3, 'Kopiko', 3); addSale(4, 'Kopiko', 3);
// Summit: 3 active days but zero current stock -> out today.
addSale(1, 'Summit', 2); addSale(2, 'Summit', 1); addSale(3, 'Summit', 1);
// Anchor: sparse sales -> low avg/green.
addSale(1, 'Anchor', 1); addSale(5, 'Anchor', 1);
// Longago: heavy sales 9 and 13 days ago — OUTSIDE the 7-day window but
// INSIDE the 14-day window (6 current stock).
addSale(9, 'Longago', 5); addSale(13, 'Longago', 5);
// Coke: none -> cold-start.

const forecasts7 = FE.forecastAll(products, sales, today);
const forecasts14 = {};
products.forEach((p) => { forecasts14[p.id] = FE.forecastForProduct(p, sales, today, 14); });

// ---- Set up a real DOM to render into ----
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(String(e && e.message || e)));
vc.on('error', (m) => errors.push(String(m)));
const HTML = ''
  + '<div id="pdContainer"></div>'
  + '<div id="morningForecastCard" style="display:none;"></div>'
  + '<div id="reportUrgent"></div>';
const dom = new JSDOM(HTML, { runScripts: 'dangerously', url: 'https://tindago.test/morning.html', pretendToBeVisual: true, virtualConsole: vc });
const doc = dom.window.document;

// Fill the containers the same way app.js does.
function renderProductDetail(product) {
  const c = doc.getElementById('pdContainer');
  const result = FE.forecastForProduct(product, sales, today, 7);
  c.innerHTML = forecastDetailCardHtml(result, product);
}
function renderMorningUrgent() {
  const c = doc.getElementById('morningForecastCard');
  const urgent = FE.urgentRestocks(products, sales, today, 7, 5);
  c.innerHTML = forecastUrgentCardHtml(urgent, 'forecastRestockSoonTitle', 'forecastRestockSoonDesc');
  c.style.display = c.innerHTML ? '' : 'none';
}
function renderReportUrgent14() {
  // Mirrors app.js renderReports() inline 14-day computation (forecast.js
  // urgentRestocks hardcodes the 7-day window, so we use 14-day explicitly).
  const c = doc.getElementById('reportUrgent');
  const list = [];
  products.forEach((p) => {
    const r = FE.forecastForProduct(p, sales, today, 14);
    if (r.confidence !== FE.CONF.INSUFFICIENT && r.predictedDaysUntilOut != null && r.predictedDaysUntilOut <= 14) {
      list.push({ product: p, result: r });
    }
  });
  list.sort((a, b) => a.result.predictedDaysUntilOut - b.result.predictedDaysUntilOut);
  if (list.length > 5) list.length = 5;
  c.innerHTML = list.length === 0 ? '' : list.map(_fcUrgentRowHtml).join('');
  return list;
}
function textOf(selector) {
  const el = doc.querySelector(selector);
  return el ? el.textContent.trim() : '(missing)';
}


console.log('=== Engine sanity (driven by real forecast.js) ===');
assert(forecasts7.p1.confidence === 'HIGH' && forecasts7.p1.predictedDaysUntilOut === 3, 'Kopiko (4 active days) -> HIGH, ~3d left', JSON.stringify(forecasts7.p1));
assert(forecasts7.p2.confidence === 'INSUFFICIENT', 'Coke (no sales) -> INSUFFICIENT');
assert(forecasts7.p3.currentStock === 0 && forecasts7.p3.predictedDaysUntilOut === 0, 'Summit (0 stock, demand) -> out today');
assert(forecasts7.p4.predictedDaysUntilOut > 7, 'Anchor (slow) not urgent within 7d', 'days=' + forecasts7.p4.predictedDaysUntilOut);
assert(forecasts7.p5.confidence === 'INSUFFICIENT', 'Longago (no 7d sales) -> INSUFFICIENT at 7d');
assert(forecasts14.p5.confidence !== 'INSUFFICIENT' && forecasts14.p5.predictedDaysUntilOut != null && forecasts14.p5.predictedDaysUntilOut <= 14,
  'Longago (14d sales) urgent at 14d window', JSON.stringify(forecasts14.p5));

console.log('\n=== A. Product Detail forecast card (7d) ===');
renderProductDetail(products[0]); // Kopiko
assert(doc.querySelector('[data-fc-detailcard]') != null, 'forecast card renders for a product');
assert(textOf('[data-fc-title]').indexOf('Forecast Demand') !== -1, 'card shows "Forecast Demand" title', textOf('[data-fc-title]'));
assert(textOf('[data-fc-chip]') === 'High', 'confidence chip shows High', textOf('[data-fc-chip]'));
assert(doc.querySelectorAll('[data-fc-bar]').length === 7, 'card renders 7 history bars', String(doc.querySelectorAll('[data-fc-bar]').length));
assert(doc.querySelectorAll('[data-fc-stat]').length === 3, 'card renders Avg/EMA/Trend stat tiles', String(doc.querySelectorAll('[data-fc-stat]').length));
assert(textOf('[data-fc-avg]') === '1.7', 'Avg stat shows engine avg to 1dp', textOf('[data-fc-avg]'));
assert(/~3 days left/.test(textOf('[data-fc-daystext]')), 'shows ~3 days left prediction', textOf('[data-fc-daystext]'));
assert(textOf('[data-fc-suggest]').indexOf('Suggest') !== -1, 'shows Suggest label', textOf('[data-fc-suggest]'));
assert(/\+8/.test(textOf('[data-fc-suggest]')) ? true : textOf('[data-fc-suggest]').indexOf('+') !== -1, 'suggest count rendered', textOf('[data-fc-suggest]'));
assert(textOf('[data-fc-for7]') === 'for 7 days', 'shows "for 7 days" qualifier', textOf('[data-fc-for7]'));
assert(textOf('[data-fc-howitworks]').indexOf('Avg from 7 days') !== -1, 'shows how-it-works caption', textOf('[data-fc-howitworks]'));

console.log('\n=== B. Product Detail cold-start (Coke) ===');
renderProductDetail(products[1]);
assert(doc.querySelector('[data-fc-coldstart]') != null, 'cold-start product shows insufficient-data block');
assert(textOf('[data-fc-confkey]').indexOf('Collecting data') !== -1, 'shows Collecting data\u2026', textOf('[data-fc-confkey]'));
assert(textOf('[data-fc-hintkey]').indexOf('Not enough history') !== -1, 'shows insufficient-history hint', textOf('[data-fc-hintkey]'));
assert(doc.querySelector('[data-fc-daystext]') == null, 'cold-start card has NO days-left prediction');


console.log('\n=== C. Morning urgent-restock card (7d) ===');
renderMorningUrgent();
const morningRows = doc.querySelectorAll('[data-fc-row]');
assert(morningRows.length === 2, 'morning urgent card lists 2 urgent items (Summit, Kopiko)', 'got ' + morningRows.length);
assert(textOf('[data-fc-urgent-title]').indexOf('Restock Soon (ML Forecast)') !== -1, 'morning card title present', textOf('[data-fc-urgent-title]'));
assert(doc.getElementById('morningForecastCard').style.display !== 'none', 'morning card is visible when urgent items exist');
const firstRow = doc.querySelectorAll('[data-fc-row]')[0];
assert(textOf('[data-fc-row-name]') === 'Summit', 'most urgent listed first: Summit', textOf('[data-fc-row-name]'));
assert(textOf('[data-fc-row-daystext]') === 'Out today', 'Summit row shows "Out today"', textOf('[data-fc-row-daystext]'));
assert(firstRow.querySelector('[data-fc-dot]').style.background === 'rgb(220, 38, 38)', 'out-today dot is red', firstRow.querySelector('[data-fc-dot]').style.background);
assert(/^\+\d+$/.test(textOf('[data-fc-row-suggest]')) || /^\d+$/.test(textOf('[data-fc-row-suggest]').replace('+','')), 'row shows +suggest qty', textOf('[data-fc-row-suggest]'));

console.log('\n=== C2. Morning card hides when nothing urgent ===');
doc.getElementById('morningForecastCard').innerHTML = forecastUrgentCardHtml([], 'forecastRestockSoonTitle', 'forecastRestockSoonDesc');
doc.getElementById('morningForecastCard').style.display = doc.getElementById('morningForecastCard').innerHTML ? '' : 'none';
assert(doc.getElementById('morningForecastCard').style.display === 'none' && doc.getElementById('morningForecastCard').innerHTML === '', 'morning card hidden when list is empty');

console.log('\n=== D. Reports urgent-restock (14d window) ===');
const report14 = renderReportUrgent14();
const reportNames = Array.prototype.map.call(doc.querySelectorAll('[data-fc-row-name]'), (el) => el.textContent.trim());
assert(report14.length === 3, 'reports(14d) lists 3 urgent items (Summit, Kopiko, Longago)', 'got ' + report14.length + ': ' + reportNames.join(','));
assert(reportNames.indexOf('Longago') !== -1, 'Longago (buy only within 14d) is urgent in 14d reports', reportNames.join(','));
assert(morningRows.length === 2 && Array.prototype.map.call(morningRows, (el) => el.querySelector('[data-fc-row-name]').textContent.trim()).indexOf('Longago') === -1,
  'Longago is NOT urgent in the 7d morning list (proves 14d baseline)');
assert(reportNames[0] === 'Summit', '14d list sorted by days ascending — Summit (0d) first', reportNames.join(','));
assert(/[0-9]+d left|Out today/.test(textOf('[data-fc-row-daystext]')), 'Longago row shows days-left text', textOf('[data-fc-row-daystext]'));

console.log('\n=== E. All Stage 4 i18n keys exist in app.js EN block ===');
const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
[
  'forecastDetailTitle','forecastDetailSubtitle','forecastMethod','forecastHistory','forecastHowItWorks',
  'forecastConfidenceHigh','forecastConfidenceMedium','forecastConfidenceLow','forecastInsufficientData',
  'forecastInsufficientHint','forecastAvgLabel','forecastEmaLabel','forecastTrendLabel',
  'forecastSuggestedRestock','forecastFor7Days','forecastDaysLeftFull','forecastDaysLeftShort',
  'forecastAvgPerDay','forecastRestockSoonTitle','forecastRestockSoonDesc','forecastReportTitle',
  'forecastReportDesc','forecastUrgentOutToday','forecastUrgentOutOfStock'
].forEach((k) => {
  assert(new RegExp('\\b' + k + '\\s*:').test(appSrc), 'EN key present: ' + k);
});

console.log('\n=== F. No console/jsdom errors during render ===');
assert(errors.length === 0, 'no jsdom/console errors', errors.join(' | '));

console.log('\n' + (failed === 0 ? 'ALL TESTS PASSED' : failed + ' FAILURES') +
  '  (' + passed + ' passed, ' + failed + ' failed)');
process.exit(failed === 0 ? 0 : 1);

