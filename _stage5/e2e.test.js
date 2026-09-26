/* Stage 5 — End-to-end browser-behaviour verification for inventory.html.
/* Stage 5 — End-to-end browser-behaviour verification for inventory.html.
   Uses jsdom (real DOM + event semantics) to run the REAL inline <script> from
   inventory.html against a faithful reproduction of the app.js integration
   surface (taxonomy + labels + window.t + inventory filter functions).

   Verified behaviours:
     A. Search typing renders inventory exactly once (no double-render).
     B. Category drill-down: opens, lists 12 keys + All, selection persists,
        closes, label syncs, active-row highlight applies.
     C. Subcategory drill-down + back navigation + label + active highlight.
     D. Persistence across "reload": a fresh window seeded with the persisted
        sessionStorage restores the label + active row.
     E. Stale-data migration (real loadState repair code) fixes old taxonomy.
*/
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..'); // git/TindaGo
const HTML = fs.readFileSync(path.join(ROOT, 'inventory.html'), 'utf8');
const INJECT = fs.readFileSync(path.join(__dirname, 'inject_globals.js'), 'utf8');

const report = { passed: 0, failed: 0 };
function check(name, cond, detail) {
  if (cond) { report.passed++; console.log('  PASS  ' + name); }
  else { report.failed++; console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : '')); }
}
function makeWin(seedSS) {
  const errors = [];
  const virtualConsole = new (require('jsdom').VirtualConsole)();
  virtualConsole.on('jsdomError', (e) => { errors.push(String(e && e.message || e)); });
  virtualConsole.on('error', (m) => { errors.push(String(m)); });
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'https://tindago.test/inventory.html',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      if (seedSS) {
        for (const k in seedSS) {
          try { window.sessionStorage.setItem(k, seedSS[k]); } catch (e) {}
        }
      }
      try { window.eval(INJECT); } catch (e) { errors.push('inject: ' + e.message); }
    }
  });
  return { window: dom.window, doc: dom.window.document, errors };
}
function click(el) { const e = el.ownerDocument.createEvent('MouseEvents'); e.initEvent('click', true, true); el.dispatchEvent(e); }
function fireInput(input, value) { input.value = value; input.dispatchEvent(new input.ownerDocument.defaultView.Event('input', { bubbles: true })); }

module.exports = { check, makeWin, click, fireInput, report };
