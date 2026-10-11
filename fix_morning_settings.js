var fs = require('fs');
var morning = fs.readFileSync('git/TindaGo/morning.html', 'utf8');
var stock = fs.readFileSync('git/TindaGo/inventory.html', 'utf8');

function extractFullAE(html, href) {
  var i = html.indexOf('href="' + href + '"');
  if (i < 0) return null;
  var tagStart = html.lastIndexOf('<a ', i);
  if (tagStart < 0) return null;
  var tagOpenEnd = html.indexOf('>', tagStart);
  if (tagOpenEnd < 0) return null;
  var depth = 0, end = -1;
  for (var j = tagStart; j < html.length; j++) {
    var c = html[j];
    if (c === '<') depth++;
    if (c === '>') {
      depth--;
      if (depth === 0 && j > tagOpenEnd) { end = j + 1; break; }
    }
  }
  if (end < 0) return null;
  return html.slice(tagStart, end);
}

var stockBlock = extractFullAE(stock, 'setting.html');
var morningBlock = extractFullAE(morning, 'setting.html');

console.log('STOCK settings block length:', stockBlock ? stockBlock.length : 'null');
console.log('MORNING settings block length:', morningBlock ? morningBlock.length : 'null');
console.log('identical before fix:', stockBlock === morningBlock);
console.log('');

if (!stockBlock || !morningBlock) { console.log('ABORT: could not extract'); process.exit(1); }

var out = morning.replace(morningBlock, stockBlock);
console.log('replaced. new morning length:', out.length, '(was', morning.length, ')');
fs.writeFileSync('git/TindaGo/morning.html', out);

// verify
var after = fs.readFileSync('git/TindaGo/morning.html', 'utf8');
var afterBlock = extractFullAE(after, 'setting.html');
console.log('after fix identical to stock:', afterBlock === stockBlock);
