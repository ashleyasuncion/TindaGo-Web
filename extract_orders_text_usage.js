var fs = require('fs');
var src = fs.readFileSync('app.js', 'utf8').split('\n');

// Orders-relevant keys we care about for the page's translated text.
var KEYS = [
  'ordersTitle',
  'ordersTotalLabel',
  'viewPreordersLink',
  'ordersCheckBtn',
  'ordersLink',
  'ordersNoOrders',
  'ordersEmpty',
  'ordersPendingCount',
  'ordersPaymentMethod',
  'ordersValidateSale',
  'ordersValidate',
  'ordersCancel',
  'ordersCancelBtn',
  'ordersDetailTitle',
  'ordersDetailTotal',
  'ordersDetailValidate',
  'ordersDetailCancel',
  'ordersFulfilledToast',
  'ordersCancelToast',
  'ordersOfflineError',
  'ordersTabTitle'
];

// Normalize a token: if it looks like an array member access with an object literal,
// skip it. We only want t('key') / t("key") style lookups.
function isDirectTLookup(line) {
  // quick heuristic: the line should contain t('X') or t("X") where X matches a key
  for (var i = 0; i < KEYS.length; i++) {
    var k = KEYS[i];
    if (line.indexOf("t('"+k+"')") >= 0 || line.indexOf('t("'+k+'")') >= 0) return true;
  }
  return false;
}

var hits = [];
for (var i = 0; i < src.length; i++) {
  var line = src[i];
  // Skip comment-only lines
  var trimmed = line.replace(/^\s+/, '');
  if (trimmed.indexOf('//') === 0) continue;

  // Match t('key') or t("key")
  var single = line.match(/t\('([^']+)'\)/g);
  var double = line.match(/t\("([^"]+)"\)/g);

  var seen = {};
  if (single) {
    for (var si = 0; si < single.length; si++) {
      var key = single[si].replace(/t\('/, '').replace(/'\)/, '');
      if (KEYS.indexOf(key) >= 0) {
        if (!seen[key]) {
          seen[key] = true;
          hits.push({ lineNo: i + 1, key: key, quote: "'", snippet: line.trim() });
        }
      }
    }
  }
  if (double) {
    for (var di = 0; di < double.length; di++) {
      var key = double[di].replace(/t\("/, '').replace(/"\)/, '');
      if (KEYS.indexOf(key) >= 0) {
        if (!seen[key]) {
          seen[key] = true;
          hits.push({ lineNo: i + 1, key: key, quote: '"', snippet: line.trim() });
        }
      }
    }
  }
}

// Deduplicate by line+key
var dedup = [];
var map = {};
for (var hi = 0; hi < hits.length; hi++) {
  var h = hits[hi];
  var id = h.lineNo + '|' + h.key;
  if (!map[id]) {
    map[id] = true;
    dedup.push(h);
  }
}
dedup.sort(function(a,b){ return a.lineNo - b.lineNo; });

console.log('=== Orders-relevant t() lookups in app.js ===');
for (var j = 0; j < dedup.length; j++) {
  console.log(dedup[j].lineNo + ': ' + dedup[j].snippet);
}
console.log('\nTotal distinct key hits: ' + dedup.length);
