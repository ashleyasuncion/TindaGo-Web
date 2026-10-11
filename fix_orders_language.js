var fs = require('fs');
var s = fs.readFileSync('app.js', 'utf8').split('\n');

// Block-aware scan: track current strings block by top-level "lang: {" openers
// (indent 4) and their closing "}," (indent <= 4, trimmed === "},").
// Record the FIRST ordersTitle line seen in each of the en and fil blocks.
var inEn = false, inFil = false;
var enLine = null, filLine = null;
var enClosed = false, filClosed = false;

for (var i = 0; i < s.length; i++) {
  var l = s[i];
  if (l.indexOf('en: {') >= 0) inEn = true;
  if (l.indexOf('fil: {') >= 0) inFil = true;
  if (inEn && !enClosed && l.indexOf('ordersTitle') >= 0 && enLine === null) enLine = l;
  if (inFil && !filClosed && l.indexOf('ordersTitle') >= 0 && filLine === null) filLine = l;
  if (inEn && l.trim() === '},') inEn = false, enClosed = true;
  if (inFil && l.trim() === '},') inFil = false, filClosed = true;
}

function valOf(line) {
  if (!line) return null;
  var m = line.match(/:[\"\x20]*([\"\x27][^\"\x27]+[\"\x27]|[^,]+)/);
  if (!m) return null;
  var v = m[1].trim();
  var q = v[0];
  if ((q === '\x27' && v[v.length - 1] === '\x27') || (q === '"' && v[v.length - 1] === '"')) v = v.slice(1, -1);
  return v;
}

var out = 'ordersTitle localization report:\n';
out += '  EN  line: ' + (enLine ? enLine.trim() : 'NONE') + '\n';
out += '  EN  value: ' + (valOf(enLine) || 'NONE') + '\n';
out += '  FIL line: ' + (filLine ? filLine.trim() : 'NONE') + '\n';
out += '  FIL value: ' + (valOf(filLine) || 'NONE') + '\n';

// Decide required edits:
//  - en block must have ordersTitle: "Orders"  (English)
//  - fil block must have ordersTitle: "Mga Order" (Filipino)
var enVal = valOf(enLine);
var filVal = valOf(filLine);
var edits = [];

if (enVal !== 'Orders') {
  // Find the line index for enLine and rewrite it to the English value,
  // matching the prevailing quote style in the en block (double quotes per L742).
  var enIdx = s.indexOf(enLine);
  if (enIdx < 0) { out += '\nERROR: could not locate en ordersTitle line index.\n'; }
  else {
    s[enIdx] = '      ordersTitle: "Orders",';
    edits.push('rewrote en block line ' + (enIdx + 1) + ' to ordersTitle: "Orders"');
  }
}

if (filVal !== 'Mga Order') {
  if (filLine) {
    var filIdx = s.indexOf(filLine);
    if (filIdx >= 0) {
      s[filIdx] = '      ordersTitle: "Mga Order",';
      edits.push('rewrote fil block line ' + (filIdx + 1) + ' to ordersTitle: "Mga Order"');
    } else { out += '\nERROR: fil ordersTitle line not locatable by index.\n'; }
  } else {
    // fil block has no ordersTitle at all — insert one inside the fil block.
    // Locate the fil block opener line index.
    var filOpenIdx = -1;
    for (var j = 0; j < s.length; j++) {
      if (s[j].indexOf('fil: {') >= 0) { filOpenIdx = j; break; }
    }
    if (filOpenIdx < 0) { out += '\nERROR: could not locate fil: { opener.\n'; }
    else {
      // Insert right after the fil opener, matching 6-space indent used by other
      // fil members (e.g. L793 "      greeting: ...").
      var insertLine = '      ordersTitle: "Mga Order",';
      s.splice(filOpenIdx + 1, 0, insertLine);
      edits.push('inserted fil block ordersTitle at line ' + (filOpenIdx + 2));
    }
  }
}

if (edits.length) {
  fs.writeFileSync('app.js', s.join('\n'), 'utf8');
  out += '\nEdits applied:\n' + edits.join('\n') + '\n';
} else {
  out += '\nNo edits needed.\n';
}

process.stdout.write(out);
