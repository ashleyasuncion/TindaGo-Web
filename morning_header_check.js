var fs = require('fs');
var h = fs.readFileSync('git/TindaGo/morning.html', 'utf8');

function has(s) { return h.indexOf(s) !== -1; }

console.log('=== Morning unified header check ===');
console.log('manageStoreBtn present:', has('id="manageStoreBtn"'));
console.log('  manageStore href = inventory.html:', has('href="inventory.html"'));
console.log('headerTutorialBtn present:', has('id="headerTutorialBtn"'));
console.log('pageMorning title present:', has('data-i18n="pageMorning"'));
console.log('Settings link present:', has('href="setting.html"'));
console.log('');

var navRe = /<nav class="bottom-nav"[^>]*>[\s\S]*?<\/nav>/g;
var m = navRe.exec(h);
var hrefs = [];
if (m) {
  var hm = /href="([^"]+)"/g;
  var mm;
  while ((mm = hm.exec(m[0]))) hrefs.push(mm[1]);
}
console.log('Morning bottom-nav hrefs:', hrefs.join(' / '));
console.log('Bottom Nav 1 intact (Morning/Day/Closing):', hrefs.indexOf('morning.html') !== -1 && hrefs.indexOf('setting.html') === -1);

console.log('');
console.log('Header block:');
var i = h.indexOf('<!-- HEADER (unified main-page header) -->');
if (i >= 0) console.log(h.slice(i, i + 120) + '...');
