// Validate all inline <script> blocks across all backoffice pages.
// Usage: node check-inline.js [file...]
// If no files given, checks every .html in the same directory as this script.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let targets = process.argv.slice(2);
if (!targets.length) {
  targets = fs.readdirSync(__dirname).filter(f => f.endsWith('.html')).map(f => path.join(__dirname, f));
}

let allOk = true;
for (const filePath of targets) {
  const c = fs.readFileSync(filePath, 'utf8');
  const blocks = [...c.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  const nonEmpty = blocks.filter(x => x[1].trim().length > 0);
  let fileOk = true;
  nonEmpty.forEach((x, i) => {
    try {
      vm.createScript(x[1]);
    } catch (e) {
      fileOk = false;
      allOk = false;
      console.log(`SYNTAX ERROR ${path.basename(filePath)} block#${i + 1}: ${e.message}`);
    }
  });
  if (fileOk) console.log(`${path.basename(filePath)}: OK (${nonEmpty.length} inline blocks)`);
}
process.exit(allOk ? 0 : 1);
