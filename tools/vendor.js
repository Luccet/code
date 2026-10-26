#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Writes a local copy of highlight.js, at the version code.js pins, in the layout
// its ?base= option takes: DIR/highlight/, from the @highlightjs/cdn-assets package (fetched once
// into node_modules/.cache/luccet-smoke/, checked against the registry's hash).
// For a note read offline, or under a strict policy. (From the Luccet engine's
// `luccet vendor`, before 2.0.)
//
//   node tools/vendor.js DIR
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = 'highlight.min.js languages'.split(' ');

function main() {
  const dir = process.argv[2];
  if (!dir || process.argv.length > 3) {
    console.error('usage: node tools/vendor.js DIR');
    process.exit(2);
  }
  const st = fs.statSync(dir, { throwIfNoEntry: false });
  if (st && !st.isDirectory()) {
    console.error(`${dir} is not a folder`);
    process.exit(2);
  }
  const m = /version: '([\d.]+)'/.exec(fs.readFileSync(path.join(ROOT, 'code.js'), 'utf8'));
  if (!m) throw new Error('code.js pins no version');
  const version = m[1];
  require('./hljs').packageDir(version).then(
    (pkg) => {
      const from = path.join(pkg, '');
      const to = path.join(dir, 'highlight');
      let n = 0;
      const copy = (src, dest) => {
        if (fs.statSync(src).isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          for (const name of fs.readdirSync(src).sort()) copy(path.join(src, name), path.join(dest, name));
          return;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        n++;
      };
      for (const f of FILES) copy(path.join(from, f), path.join(to, f));
      const shown = path.relative(process.cwd(), to).split(path.sep).join('/') || '.';
      console.error(`highlight.js ${version} → ${shown} (${n} files); load it with code.js?base=${shown}`);
    },
    (e) => {
      console.error(`highlight.js ${version} could not be fetched (${(e && e.message) || e}); is the network there?`);
      process.exit(1);
    },
  );
}

main();
