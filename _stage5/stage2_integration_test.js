// Stage 2 integration-logic validation: badges + forecast-urgency sort.
// Mirrors the helpers added to app.js (forecastBadgeHtml / forecastUrgencyRank)
// and verifies their behavior against the real ForecastEngine from forecast.js.
// Run:  node _stage5/stage2_integration_test.js
//
// NOTE: app.js itself is a DOM-bound IIFE and can't be imported in Node, so we
// re-declare the two pure decision helpers here and feed them real engine output.

const fs = require('fs');
const path = require('path');

const forecastSrc = fs.readFileSync(path.join(__dirname, '..', 'forecast.js'), 'utf8');
const sandbox = {};
(new Function('window', 'self', forecastSrc + '\nreturn window.ForecastEngine;'))(sandbox, sandbox);
const FE = sandbox.ForecastEngine;

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('PASS  ' + msg); }
  else { failed++; console.log('FAIL  ' + msg); }
}

// ── Helpers copied 1:1 from app.js (Stage 2) ──
const STR = {
  forecastInsufficientData: 'Collecting data…',
  forecastNoDemand: 'No demand',
  forecastOutOfStock: 'Out of stock',
  forecastOutToday: 'Out today',
  forecastDaysLeftShort: '{n}d left',
  forecastAvgPerDay: 'Avg {n}/day',
};
function forecastBadgeHtml(result) {
  if (!result) return '';
  var confInsufficient = (FE.CONF && FE.CONF.INSUFFICIENT) || 'INSUFFICIENT';
  var minAvg = FE.MIN_AVG_THRESHOLD;
  var days = result.predictedDaysUntilOut;
  let html;
  if (result.confidence === confInsufficient) {
    html = '[' + STR.forecastInsufficientData + ']';
  } else if (result.avgDaily < minAvg) {
    html = '[' + STR.forecastNoDemand + ']';
  } else if (result.currentStock <= 0) {
    html = '[' + STR.forecastOutOfStock + ']';
  } else if (days == null) {
    html = '[' + STR.forecastNoDemand + ']';
  } else if (days === 0) {
    html = '[' + STR.forecastOutToday + ']';
  } else {
    var daysText = STR.forecastDaysLeftShort.replace('{n}', days);
    var avgText = STR.forecastAvgPerDay.replace('{n}', result.avgDaily.toFixed(1));
    var cls = days <= 3 ? 'RED' : (days <= 7 ? 'AMBER' : 'GREEN');
    html = '[' + cls + ' ' + daysText + ' • ' + avgText + ']';
  }
  return html;
}
function forecastUrgencyRank(result) {
  if (!result) return 1e9;
  if (result.currentStock <= 0) return 0;
  if (result.predictedDaysUntilOut == null) return 1e9;
  return result.predictedDaysUntilOut;
}

// Replicate the app.js render sort (forecast urgency then name tie-break).
function sortByForecast(products, forecasts) {
  return products.slice().sort(function(a, b){
    var ra = forecastUrgencyRank(forecasts[a.id]);
    var rb = forecastUrgencyRank(forecasts[b.id]);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

// ── Build a small simulation dataset ──
// today = fixed so dates are deterministic. 4 products:
//   Kopiko (fast seller, 4 stock) -> ~2d left  (red)
//   Sardines (slow, 7 stock)      -> ~11d      (green)
//   Bigas (popcorn, 3 stock)      -> ~1d       (red, tie-break test)
//   Coke (0 sales, new)           -> collecting (gray / no rank)
const today = '2026-09-20';
function dateBefore(days) {
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
const products = [
  { id: 'p1', name: 'Kopiko', quantity: 4 },
  { id: 'p2', name: 'Sardines', quantity: 7 },
  { id: 'p3', name: 'Bigas', quantity: 3 },
  { id: 'p4', name: 'Coke', quantity: 10 },
];
const sales = [];
function addSale(date, productName, qty) {
  for (let i = 0; i < qty; i++) sales.push({ date, productName, quantity: 1 });
}
// Kopiko: 3/day for 4 days -> high confidence
addSale(dateBefore(1), 'Kopiko', 3);
addSale(dateBefore(2), 'Kopiko', 3);
addSale(dateBefore(3), 'Kopiko', 3);
addSale(dateBefore(4), 'Kopiko', 3);
// Sardines: 0.5/day (every other day) -> medium, slow
addSale(dateBefore(1), 'Sardines', 1);
addSale(dateBefore(3), 'Sardines', 1);
addSale(dateBefore(5), 'Sardines', 1);
// Bigas: 3/day for 2 days -> low confidence but high demand
addSale(dateBefore(1), 'Bigas', 4);
addSale(dateBefore(2), 'Bigas', 4);
// Coke: none

const forecasts = FE.forecastAll(products, sales, today);

// Badge checks
assert(forecastUrgencyRank(forecasts.p4) === 1e9, 'Coke (no sales) has no urgency rank (1e9)');
assert(forecasts.p1.confidence === 'HIGH', 'Kopiko (4 active days) -> HIGH confidence');
assert(forecasts.p2.confidence === 'MEDIUM', 'Sardines (3 active days) -> MEDIUM confidence');
// Kopiko: 12 sold / 7-day window = 1.71 avg (rounded 1.7), stock 4 -> ceil(4/1.71)=3 days left
assert(forecasts.p1.predictedDaysUntilOut === 3, 'Kopiko 4 stock / ~1.7 avg -> 3 days left');

const b1 = forecastBadgeHtml(forecasts.p1);
const b2 = forecastBadgeHtml(forecasts.p2);
const b4 = forecastBadgeHtml(forecasts.p4);
assert(/RED/.test(b1), 'Kopiko badge is RED (urgent): ' + b1);
assert(/GREEN/.test(b2), 'Sardines badge is GREEN (comfortable): ' + b2);
assert(/Collecting data/.test(b4), 'Coke badge is "Collecting data…": ' + b4);

// Sort check: Bigas (3d) & Kopiko (3d) tie at 3; name tie-break puts Bigas first,
// then Kopiko, then Sardines (17d, GREEN), then Coke (no demand, last).
const ordered = sortByForecast(products, forecasts).map(function(p){ return p.name; });
assert(ordered.join(',') === 'Bigas,Kopiko,Sardines,Coke',
  'Urgency sort = Bigas, Kopiko, Sardines, Coke  (got: ' + ordered.join(',') + ')');

// Name sort (toggle off) still works
const byName = products.slice().sort(function(a,b){ return a.name.localeCompare(b.name); })
  .map(function(p){ return p.name; });
assert(byName.join(',') === 'Bigas,Coke,Kopiko,Sardines',
  'Name sort = Bigas, Coke, Kopiko, Sardines  (got: ' + byName.join(',') + ')');

console.log('\n' + (failed === 0 ? 'ALL TESTS PASSED' : failed + ' FAILURES') +
  '  (' + passed + ' passed, ' + failed + ' failed)');
process.exit(failed === 0 ? 0 : 1);
