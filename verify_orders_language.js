var fs = require('fs');
var vm = require('vm');

var src = fs.readFileSync('app.js', 'utf8');

function extractBlock(name) {
  var start = src.indexOf(name + ': {');
  if (start < 0) return null;
  // find the matching close: the "}," at the same indent level (4 spaces) that
  // ends this block. The block body is indented 6 spaces; the close is indented 4.
  var pos = start + (name + ': {').length;
  // scan forward for a line whose trimmed value is "}," and whose indent is 4.
  var searchFrom = pos;
  while (searchFrom < src.length) {
    var lineStart = src.lastIndexOf('\n', searchFrom) + 1;
    var before = src.slice(lineStart, searchFrom);
    var trimmed = src.slice(searchFrom).trim();
    if (trimmed === '},') {
      var indent = searchFrom - lineStart;
      if (indent === 4) {
        var blockBody = src.slice(pos, searchFrom); // without leading "name: {"
        var snippet = 'var strings = { ' + name + ': ' + blockBody + '}; return strings;';
        try {
          return vm.runInNewContext(snippet, { console: console });
        } catch (e) {
          return null;
        }
      }
    }
    searchFrom = src.indexOf('\n', searchFrom) + 1;
    if (searchFrom <= 0) break;
  }
  return null;
}

function t(strings, lang, key) {
  return (strings[lang] && strings[lang][key]) || (strings.en && strings.en[key]) || key;
}

var enBlock = extractBlock('en');
var filBlock = extractBlock('fil');

if (!enBlock || !filBlock) {
  console.log('FAILED: could not extract en/fil blocks (en=' + !!enBlock + ' fil=' + !!filBlock + ')');
  process.exit(1);
}

var key = 'ordersTitle';
var enVal = t(enBlock, 'en', key);
var filVal = t(filBlock, 'fil', key);

console.log('Language-rule verification for ordersTitle:');
console.log('  EN  -> ' + (enVal === key ? 'FALLBACK(key)' : enVal));
console.log('  FIL -> ' + (filVal === key ? 'FALLBACK(key)' : filVal));

var ok = (enVal === 'Orders') && (filVal === 'Mga Order');
console.log('\n' + (ok ? 'LANGUAGE RULE OK: en=Orders, fil=Mga Order' : 'LANGUAGE RULE WRONG'));
process.exit(ok ? 0 : 1);
