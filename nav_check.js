var fs = require('fs');
var files = [
  'git/TindaGo/backoffice/preorders.html',
  'git/TindaGo/inventory.html',
  'git/TindaGo/debts.html',
  'git/TindaGo/morning.html',
  'git/TindaGo/restock.html'
];
var navRe = /<nav class="bottom-nav"[^>]*>[\s\S]*?<\/nav>/g;
files.forEach(function(f) {
  var h = fs.readFileSync(f, 'utf8');
  var m = navRe.exec(h);
  var hrefs = [];
  if (m) {
    var hm = /href="([^"]+)"/g;
    var mm;
    while ((mm = hm.exec(m[0]))) hrefs.push(mm[1]);
  }
  var hasMorning = hrefs.indexOf('morning.html') !== -1;
  console.log(f + ' -> ' + hrefs.join(' / ') + (hasMorning ? '  (HAS Morning)' : '  (no Morning)'));
});
