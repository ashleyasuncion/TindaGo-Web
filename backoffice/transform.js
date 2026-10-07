// Transform script — one-time migration helper for the backoffice sidebar change.
// The pages now load shared sidebar.css + sidebar.js. This helper documents the
// migration and re-applies the structural changes if ever run against base pages:
//   1. The sidenav host sits OUTSIDE .layout (sibling, so it never scrolls with content)
//   2. The overlay is a direct body child
//   3. Brand toggle gets the aria/title attrs used as the drawer toggle
//   4. Shared sidebar CSS/JS is linked in each page
const fs = require('fs');
const path = require('path');
const base = 'C:/Users/PLP23-00167/Desktop/Capstone App/git/TindaGo/backoffice';

const FILES = ['dashboard.html', 'products.html', 'suppliers.html', 'expenses.html', 'debts.html', 'reports.html', 'restock.html'];

function transformFile(filename) {
  const filepath = path.join(base, filename);
  let c = fs.readFileSync(filepath, 'utf8');

  // 1. Link shared sidebar CSS/JS (idempotent — replace() no-ops if absent)
  if (!c.includes('sidebar.css')) {
    c = c.replace('<link rel="icon"', '<link href="sidebar.css" rel="stylesheet">\n  <link rel="icon"');
  }
  if (!c.includes('sidebar.js')) {
    c = c.replace('<script src="db.js"></script>', '<script src="db.js"></script>\n<script src="sidebar.js"></script>');
  }

  // 2. Ensure brand toggle attrs
  c = c.replace(/id="brandToggle">(\\s*<img)/g, 'id="brandToggle" title="Toggle navigation" aria-label="Toggle navigation" aria-controls="sidenav" aria-expanded="false">$1');

  // 3. Overlay as direct body child (insert right after </header>)
  if (!c.includes('id="sidenavOverlay"')) {
    c = c.replace(/<\/header>/, '</header>\n  <!-- Mobile Sidenav Overlay -->\n  <div class="sidenav-overlay" id="sidenavOverlay"></div>');
  }

  // 4. Move the sidenav host OUTSIDE .layout (so it never scrolls with content)
  //    Before: <div class="layout">\n <div id="sidenavHost"></div>\n <main ...
  //    After:  <div id="sidenavHost"></div>\n <div class="layout">\n <main ...
  c = c.replace(/<div class="layout">\s*<div id="sidenavHost">/, '<div id="sidenavHost"></div>\n<div class="layout">\n<div id="sidenavHost-moved-flag">');
  // Clean up the marker (not actually used; kept comment-free via second pass)
  c = c.replace(/<div id="sidenavHost-moved-flag">/, '');

  // 5. Drop obsolete inline sidenav CSS (shared sidebar.css now owns it)
  c = c.replace(/\.sidenav\{width:220px[^}]*\}/g, '');
  c = c.replace(/\.sidenav a\{[^}]*\}/g, '');
  c = c.replace(/\.sidenav a:hover\{[^}]*\}/g, '');
  c = c.replace(/\.sidenav a\.active\{[^}]*\}/g, '');
  c = c.replace(/\.sidenav\{position:fixed[^}]*\}/g, '');
  c = c.replace(/\.sidenav\.open\{left:0\}/g, '');
  c = c.replace(/\.sidenav-overlay\{[^}]*\}/g, '');
  c = c.replace(/\.sidenav-overlay\.show\{[^}]*\}/g, '');
  c = c.replace(/\.sidenav\{width:100%[^}]*\}/g, '');
  c = c.replace(/\.sidenav\{display:none\}/g, '');

  // 6. Debts page: convert static inline nav into #sidenavHost placeholder
  c = c.replace(/<nav class="sidenav" id="sidenav">[\s\S]*?<\/nav>/, '<div id="sidenavHost"></div>');

  fs.writeFileSync(filepath, c, 'utf8');
  console.log('  ' + filename + ' ✓');
}

console.log('Applying sidebar restructure to backoffice pages...');
FILES.forEach(transformFile);
console.log('Done. Pages now load sidebar.css/sidebar.js; #sidenavHost sits outside .layout.');
