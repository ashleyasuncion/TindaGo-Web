// Functional parity test for forecast.js (Stage 1 verification)
// Run: node _stage5/forecast_test.js
var fs = require('fs');
var path = require('path');
var vm = require('vm');

// Shim browser globals the file expects.
var window = {};
global.window = window;

var src = fs.readFileSync(path.join(__dirname, '..', 'forecast.js'), 'utf8');
vm.runInThisContext(src, { filename: 'forecast.js' });

var FE = window.ForecastEngine;
var failures = [];
function eq(name, got, want) {
  var ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures.push(name);
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : '  => got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)));
}

console.log('=== API surface ===');
eq('exposes window.ForecastEngine', typeof FE, 'object');
eq('CONF constants', [FE.CONF.INSUFFICIENT, FE.CONF.LOW, FE.CONF.MEDIUM, FE.CONF.HIGH],
  ['INSUFFICIENT', 'LOW', 'MEDIUM', 'HIGH']);
eq('WINDOW_DAYS', FE.WINDOW_DAYS, 7);
eq('LEAD_TIME_DAYS', FE.LEAD_TIME_DAYS, 7);
eq('EMA_ALPHA', FE.EMA_ALPHA, 0.5);
eq('MIN_AVG_THRESHOLD', FE.MIN_AVG_THRESHOLD, 0.15);

// ── Scenario A: 7 consecutive days, product "Coke" sold 2/day on all 7 days ──
// today = 2026-09-26, window 2026-09-20..2026-09-26
console.log('\n=== Scenario A: steady 2/day for 7 days, stock 10 ===');
var today = '2026-09-26';
var st = new Date(2026, 8, 20); // Sep 20
var dates = [];
for (var i = 0; i < 7; i++) {
  dates.push(st.getFullYear() + '-' + String(st.getMonth() + 1).padStart(2, '0') + '-' + String(st.getDate()).padStart(2, '0'));
  st.setDate(st.getDate() + 1);
}
var allSalesA = [];
dates.forEach(function(dt) { allSalesA.push({ date: dt, productName: 'Coca-Cola', quantity: 2 }); });
var productA = { id: 1, name: 'Coca-Cola', quantity: 10 };

var rA = FE.forecastForProduct(productA, allSalesA, today);
eq('A avgDaily', rA.avgDaily, 2);
eq('A totalSold', rA.totalSold, 14);
eq('A activeDays', rA.activeDays, 7);
eq('A confidence', rA.confidence, 'HIGH');
eq('A predictedDays', rA.predictedDaysUntilOut, Math.ceil(10 / 2)); // 5
eq('A window length', rA.dailyHistory.length, 7);
eq('A first window date', rA.dailyDates[0], '2026-09-20');
eq('A last window date', rA.dailyDates[6], '2026-09-26');
// suggested = max(0, ceil(2*7 - 10)) = ceil(4) = 4
eq('A suggestedRestockQty', rA.suggestedRestockQty, 4);
// EMA of constant 2 = 2
eq('A emaDaily', rA.emaDaily, 2);

// ── Scenario B: only 1 active day → LOW ──
console.log('\n=== Scenario B: single active day ===');
var allSalesB = [{ date: '2026-09-26', productName: 'Pepsi', quantity: 5 }];
var rB = FE.forecastForProduct({ id: 2, name: 'Pepsi', quantity: 10 }, allSalesB, today);
eq('B confidence', rB.confidence, 'LOW');
eq('B activeDays', rB.activeDays, 1);
eq('B avgDaily', rB.avgDaily, 5 / 7);

// ── Scenario C: no sales at all → INSUFFICIENT, predictedDays null ──
console.log('\n=== Scenario C: no demand ===');
var rC = FE.forecastForProduct({ id: 3, name: 'Water', quantity: 10 }, [], today);
eq('C confidence', rC.confidence, 'INSUFFICIENT');
eq('C predictedDays', rC.predictedDaysUntilOut, null);
eq('C suggestedRestockQty', rC.suggestedRestockQty, 0);
eq('C avgDaily', rC.avgDaily, 0);

// ── Scenario D: low avg below 0.15 threshold → predictedDays null (no demand) ──
console.log('\n=== Scenario D: below MIN_AVG_THRESHOLD ===');
// 1 sale of qty1 in window => avgDaily = 1/7 ≈ 0.1428 < 0.15 → null
var rD = FE.forecastForProduct({ id: 4, name: 'Chips', quantity: 8 },
  [{ date: '2026-09-21', productName: 'Chips', quantity: 1 }], today);
eq('D avgDaily < 0.15 -> predictedDays null', rD.predictedDaysUntilOut, null);

// ── Scenario E: out of stock with demand → predictedDays 0 ──
// Note: must use a product whose name matches allSalesA ('Coca-Cola').
console.log('\n=== Scenario E: out of stock ===');
var rE = FE.forecastForProduct({ id: 5, name: 'Coca-Cola', quantity: 0 }, allSalesA, today);
eq('E stock 0 -> predictedDays 0', rE.predictedDaysUntilOut, 0);
eq('E suggestedRestockQty', rE.suggestedRestockQty, Math.ceil(2 * 7 - 0)); // 14

// ── Scenario F: case-insensitive match ──
console.log('\n=== Scenario F: case-insensitive substring ===');
var rF = FE.forecastForProduct({ id: 6, name: 'coca-cola', quantity: 5 },
  [{ date: '2026-09-26', productName: 'COCA-COLA ORIGINAL', quantity: 3 }], today);
eq('F matches case-insensitive activeDays', rF.activeDays, 1);

// ── Scenario G: forecastAll returns map keyed by id ──
console.log('\n=== Scenario G: forecastAll ===');
var m = FE.forecastAll([productA, { id: 3, name: 'Water', quantity: 1 }], allSalesA, today);
eq('G has product 1', !!m[1], true);
eq('G has product 3', !!m[3], true);
eq('G product 1 confidence', m[1].confidence, 'HIGH');
eq('G product 3 confidence', m[3].confidence, 'INSUFFICIENT');

// ── Scenario H: accuracy parity ──
console.log('\n=== Scenario H: accuracy ===');
eq('H accuracy exact', FE.accuracy(4, 4), 1);
eq('H accuracy zero-actual', FE.accuracy(2, 0), 0);

// ── Scenario I: buildAllSalesFromWeb adapter ──
console.log('\n=== Scenario I: web data adapter ===');
var stateWeb = {
  sales: [
    { date: '2026-09-26', productName: 'Coke', quantity: 3, amount: 99 },
    { date: '2026-09-25', description: 'Water', quantity: 2 } // fallback to description
  ],
  history: [
    { date: '2026-09-24', archivedSales: [
      { date: '2026-09-24', productName: 'Coke', quantity: 1 }
    ]}
  ]
};
var flat = FE.buildAllSalesFromWeb(stateWeb);
eq('I flat length', flat.length, 3);
eq('I normalizes fields', flat[0], { date: '2026-09-26', productName: 'Coke', quantity: 3 });
eq('I description fallback', flat[1].productName, 'Water');
eq('I archived included', flat[2].productName, 'Coke');

// ── Scenario J: date window crosses month boundary ──
console.log('\n=== Scenario J: cross-month window ===');
var todayJ = '2026-10-01';
var rJ = FE.forecastForProduct(productA, allSalesA, todayJ);
eq('J window spans into Sep', rJ.dailyDates[0], '2026-09-25');
eq('J window ends Oct 1', rJ.dailyDates[6], '2026-10-01');

console.log('\n' + (failures.length === 0 ? 'ALL TESTS PASSED' : failures.length + ' FAILURES'));
process.exit(failures.length === 0 ? 0 : 1);

