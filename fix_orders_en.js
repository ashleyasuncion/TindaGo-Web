var fs = require('fs');
var appJs = fs.readFileSync('app.js', 'utf8');
var lines = appJs.split('\n');

// English strings block starts at the line containing "en: {"
var enStart = -1;
for (var i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('en: {') >= 0) { enStart = i; break; }
}
if (enStart < 0) { console.log('ERROR: could not find en: { block'); process.exit(1); }

// Find the end of the en block: the first line at the same or lower indent
// that is "{}" on its own or a top-level key (no leading spaces) that starts
// a new section. The en block is the first child of the top-level strings obj,
// so its closing line is the first line that is exactly "    }," after the
// fil block opener... Instead, walk forward from enStart and stop when we hit
// a line that is less indented than the en members (i.e. starts with "  }" or
// is a top-level "fil: {"/"en: {" sibling).
// Safest heuristic: the en block ends right before the "fil: {" line.

var filStart = -1;
for (var j = enStart + 1; j < lines.length; j++) {
  if (lines[j].indexOf('fil: {') >= 0) { filStart = j; break; }
}
if (filStart < 0) { console.log('ERROR: could not find fil: { block'); process.exit(1); }

// Insert ordersTitle into the en block just before the fil block opener,
// matching the indentation of other en members (4 spaces).
var indent = '    ';
var newLine = indent + "ordersTitle: 'Orders',";

// Idempotency: if an en-block ordersTitle line already exists, skip.
var already = false;
for (var k = enStart; k < filStart; k++) {
  if (lines[k].indexOf("ordersTitle: 'Orders'") >= 0 || lines[k].indexOf('ordersTitle: "Orders"') >= 0) {
    already = true;
    break;
  }
}
if (already) {
  console.log('ordersTitle already present in en block; no change.');
  process.exit(0);
}

lines.splice(filStart, 0, newLine);
var out = lines.join('\n');
fs.writeFileSync('app.js', out, 'utf8');
console.log('Inserted ordersTitle into en block just before fil block (line ' + (filStart + 1) + ' after insert).');
