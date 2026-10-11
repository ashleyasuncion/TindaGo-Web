var fs = require('fs');
var morning = fs.readFileSync('git/TindaGo/morning.html', 'utf8');
var stock = fs.readFileSync('git/TindaGo/inventory.html', 'utf8');

function extractAE(html, hrefVal) {
  var needle = 'href="' + hrefVal + '"';
  var i = html.indexOf(needle);
  if (i < 0) return null;
  var tagStart = html.lastIndexOf('<a ', i);
  if (tagStart < 0) return null;
  var openAngle = html.indexOf('>', tagStart);
  if (openAngle < 0) return null;
  var depth = 0;
  var end = -1;
  for (var j = tagStart; j < html.length; j++) {
    var c = html.charAt(j);
    if (c === '<') depth++;
    else if (c === '>') {
      depth--;
      if (depth === 0 && j > openAngle) { end = j + 1; break; }
    }
  }
  if (end < 0) return null;
  return html.substring(tagStart, end);
}

var mb = extractAE(morning, 'setting.html');
var sb = extractAE(stock, 'setting.html');

console.log('MORNING settings block length:', mb ? mb.length : null);
console.log('STOCK settings block length:', sb ? sb.length : null);
console.log('identical:', mb === sb);
console.log();
console.log('=== MORNING settings block ===');
console.log(mb);
console.log();
console.log('=== STOCK settings block ===');
console.log(sb);
console.log();
if (mb && sb && mb !== sb) {
  console.log('=== DIFF (morning chars not in stock, index by index) ===');
  var marr = mb.split('');
  var sarr = sb.split('');
  var maxLen = Math.max(marr.length, sarr.length);
  for (var k = 0; k < maxLen; k++) {
    var mc = marr[k] || '<END>';
    var sc = sarr[k] || '<END>';
    if (mc !== sc) {
      var contextStart = Math.max(0, k - 25);
      var contextEnd = Math.min(maxLen, k + 25);
      console.log('diff at index ' + k + ': morning=' + JSON.stringify(mc) + ' stock=' + JSON.stringify(sc));
      console.log('  morning context: ' + JSON.stringify(mb.substring(contextStart, contextEnd)));
      console.log('  stock   context: ' + JSON.stringify(sb.substring(contextStart, contextEnd)));
      break;
    }
  }
}
