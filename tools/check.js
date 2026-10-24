#!/usr/bin/env node
/* The headless checks of the rules (js/checks.js) in node, without a browser:
     node tools/check.js            every check: exit 0 when all pass
     node tools/check.js --fail     the fail variant: each check with its own planted mistake has to FAIL (exit 1)
     node tools/check.js split      just one check
   The page runs the same: game.check() and game.check({ fail: true }). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
for (const f of ['title', 'rules', 'checks']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
}
const args = process.argv.slice(2);
const fail = args.includes('--fail');
const only = args.find((a) => !a.startsWith('--'));
const out = window.GW.checks.run({ fail, only });
for (const r of out.results) {
  const head = `${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.broken ? ` (broken: ${r.broken})` : ''}: ${r.stat}`;
  console.log(head + (r.ok ? '' : '\n      ' + r.problems.slice(0, 6).join('\n      ')));
}
const bad = out.results.filter((r) => !r.ok).length;
if (fail) console.log(`${bad}/${out.results.length} checks FAIL with their mistake planted${bad === out.results.length ? ' (as they should)' : ' - SOME CHECKS MISSED THEIR MISTAKE'} (${out.ms} ms)`);
else console.log(`${out.ok ? 'ALL OK' : 'PROBLEMS'} (${out.ms} ms)`);
process.exit(out.ok ? 0 : 1);
