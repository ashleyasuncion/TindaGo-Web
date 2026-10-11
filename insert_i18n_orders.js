var fs = require('fs');
var p = 'git/TindaGo/app.js';
var t = fs.readFileSync(p, 'utf8');
var lines = t.split('\r\n');

// anchor: find 'allStockOk:' line in en block (allow leading spaces)
var idx = -1;
for (var i = 0; i < lines.length; i++) {
  var tr = lines[i].trim();
  if (tr.indexOf('allStockOk:') === 0) { idx = i; break; }
}
if (idx < 0) { console.log('allStockOk anchor not found'); process.exit(1); }
console.log('anchor line:', idx + 1, lines[idx]);

// find fil: { start
var filIdx = -1;
for (var j = idx; j < lines.length; j++) {
  var ftr = lines[j].trim();
  if (ftr.indexOf('fil: {') === 0 || ftr === 'fil: {') { filIdx = j; break; }
}
if (filIdx < 0) { console.log('fil: anchor not found'); process.exit(1); }
console.log('fil anchor line:', filIdx + 1, lines[filIdx]);

var keysEN = [
  '      ordersTitle: "Orders",',
  '      ordersTotalLabel: "Total Orders",',
  '      ordersNoOrders: "No pending orders — you\'re all caught up!",',
  '      ordersPaymentMethod: "Paid via {method}",',
  '      ordersValidateSale: "Validate Sale",',
  '      ordersCancel: "Cancel Order",',
  '      ordersCancelConfirm: "Cancel this order? Items will return to stock",',
  '      ordersOfflineError: "Order sync needs {action} — check your connection or sign in via Settings",',
  '      ordersCheckBtn: "Check for orders",',
  '      ordersCheckBusy: "Checking for orders...",',
  '      ordersValidateSuccess: "Order validated — sale recorded and stock updated",',
  '      ordersCancelSuccess: "Order cancelled — items returned to stock",',
  '      ordersBack: "Back",',
  '      ordersViewDetail: "View order details",',
  '      ordersBubble: "Orders",',
  '      ordersBubbleCount: "{n} new order{n}",',
  '      ordersChimeMuted: "Orders chime is muted",',
  '      ordersChimeUnmuted: "Orders chime is on",',
  '      ordersEmptyDetail: "No order details to show",',
  '      ordersDetailTotal: "Total",',
  '      ordersDetailItems: "Items",',
  '      ordersDetailPayment: "Payment",',
  '      ordersDetailStatus: "Status",',
  '      ordersDetailValidate: "Validate & Record Sale",',
  '      ordersDetailCancel: "Cancel Order",',
];
var keysFIL = [
  '      ordersTitle: "Mga Order",',
  '      ordersTotalLabel: "Mga Order",',
  '      ordersNoOrders: "Walang pending na order — ikaw ay updated na!",',
  '      ordersPaymentMethod: "Bayad gamit {method}",',
  '      ordersValidateSale: "Ipatunay na Benta",',
  '      ordersCancel: "Kanselahin ang Order",',
  '      ordersCancelConfirm: "Kanselahin ang order na ito? Ang mga item ay babalik sa stock",',
  '      ordersOfflineError: "Ang order sync ay nangangailangan ng {action} — suriin ang iyong koneksyon o mag-sign in sa Settings",',
  '      ordersCheckBtn: "Surihin ang mga order",',
  '      ordersCheckBusy: "Sinasuri ang mga order...",',
  '      ordersValidateSuccess: "Order naipatunay — benta na idinerekord at stock na-update",',
  '      ordersCancelSuccess: "Order na kanselahan — ang mga item ay natalikod sa stock",',
  '      ordersBack: "Balik",',
  '      ordersViewDetail: "Tingnan ang detalye ng order",',
  '      ordersBubble: "Order",',
  '      ordersBubbleCount: "{n} bagong order{n}",',
  '      ordersChimeMuted: "Ang orders chime ay naka-mute",',
  '      ordersChimeUnmuted: "Ang orders chime ay nag-iinon",',
  '      ordersEmptyDetail: "Walang detalye ng order para ipakita",',
  '      ordersDetailTotal: "Kabuoan",',
  '      ordersDetailItems: "Mga Item",',
  '      ordersDetailPayment: "Pagbabayad",',
  '      ordersDetailStatus: "Estado",',
  '      ordersDetailValidate: "Ipapayag at I-record na Benta",',
  '      ordersDetailCancel: "Kanselar ang Order",',
];

// Insert en keys before filIdx (pushing each line), and fil keys before filIdx.
// To insert before filIdx, we splice at filIdx with the new lines.
var ins = [];
for (var e = 0; e < keysEN.length; e++) ins.push(keysEN[e]);
for (var f = 0; f < keysFIL.length; f++) ins.push(keysFIL[f]);
lines.splice(filIdx, 0, ins[0]);
for (var s = 1; s < ins.length; s++) lines.splice(filIdx + s, 0, ins[s]);

fs.writeFileSync(p, lines.join('\r\n'));
console.log('inserted', keysEN.length, 'en keys +', keysFIL.length, 'fil keys before fil block');
console.log('new total lines:', lines.length);
