var fs = require('fs');
var ordersIds = ['manageOrdersList','manageTotalOrders','ordersCheckBtn','ordersDetailOverlay','ordersDetailTitle','ordersDetailTempId','ordersDetailItems','ordersDetailTotal','ordersDetailMeta','ordersDetailNote','ordersDetailValidateBtn','ordersDetailCancelBtn','ordersDetailBackdrop'];
var bubbleReq = ['id="ordersBubble"', 'class="orders-bubble"', 'class="orders-bubble-badge"'];

var problems = [];
function check(f, reqList, label) {
  var h = fs.readFileSync(f, 'utf8');
  var missing = [];
  reqList.forEach(function(r) { if (h.indexOf(r) === -1) missing.push(r); });
  if (missing.length) problems.push(f + ': missing ' + missing.join(', '));
  else console.log(f + ': ' + label + ' OK');
}
check('git/TindaGo/backoffice/preorders.html', ordersIds.concat(bubbleReq), 'preorders (13 ids + bubble)');
check('git/TindaGo/inventory.html', bubbleReq, 'bubble only');
check('git/TindaGo/debts.html', bubbleReq, 'bubble only');
check('git/TindaGo/restock.html', bubbleReq, 'bubble only');

console.log('');
console.log('FINAL: ' + (problems.length === 0 ? 'ALL CHECKS PASSED' : 'REMAINING: ' + problems.length));
if (problems.length) problems.forEach(function(p) { console.log(' - ' + p); });
