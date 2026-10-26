#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// code.js under node: it runs under the command line with no diagnostic
// and leaves colouring to the browser; its highlight.js table is well
// formed and is the pinned version's; tools/vendor.js writes the copy ?base=
// takes. The browser's part is test/browser.js's.
//
//   LUCCET_ROOT=…/luccet node test/node.js
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const h = require('./harness');

const SRC = fs.readFileSync(path.join(h.ROOT, 'code.js'), 'utf8');
const VERSION = /version: '([\d.]+)'/.exec(SRC)[1];
const node = (args, cwd = h.ROOT) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const offline = (r) => /could not be fetched|fetch failed|ENOTFOUND|EAI_AGAIN/.test(r.err + r.out);

h.test('under luccet check and luccet build: no diagnostic, and the page holds no colouring, which is the browser\'s', async () => {
  const page = await h.checkAndBuild('code.js', '# Hello\n\n```js\nconst x = 1;\n```\n');
  h.assert(/<code class="language-js">/.test(page) && !/hljs-/.test(page), `the built fence: ${/<pre[^]*?<\/pre>/.exec(page)}`);
});

h.test('the highlight.js table is well formed', () => {
  const block = /\/\/ <hljs>[^\n]*\n([\s\S]*?)\n\s*\/\/ <\/hljs>/.exec(SRC);
  h.assert(block, 'no <hljs> table');
  const HLJS = new Function(`${block[1]}; return HLJS;`)();
  h.assert(/^\d+\.\d+\.\d+$/.test(HLJS.version), `version ${HLJS.version}`);
  const sri = /^sha384-[A-Za-z0-9+/]{64}$/;
  h.assert(sri.test(HLJS.core), `core hash ${HLJS.core}`);
  const core = new Set((/In the core: ([^.]+)\./.exec(block[1]) || [])[1].split(' '));
  const seen = new Map();
  for (const [name, [hash, ...aliases]] of Object.entries(HLJS.languages)) {
    h.assert(sri.test(hash), `${name}: hash ${hash}`);
    h.assert(!core.has(name), `${name} is in the core too`);
    for (const k of [name, ...aliases]) {
      h.assert(k === k.toLowerCase(), `${name}: "${k}" is not lower case`);
      h.assert(!seen.has(k), `"${k}" names both ${seen.get(k)} and ${name}`);
      seen.set(k, name);
    }
  }
  return `highlight.js ${HLJS.version}: ${core.size} languages in the core, ${Object.keys(HLJS.languages).length} on demand`;
});

h.test("the table is the pinned version's (tools/hljs.js --check)", () => {
  const r = node([path.join(h.ROOT, 'tools', 'hljs.js'), '--check']);
  if (r.code !== 0 && offline(r)) throw new h.Skip(`highlight.js ${VERSION} is not cached and could not be fetched`);
  h.assert(r.code === 0, `${r.out}${r.err}`);
});

h.test('tools/vendor.js: highlight.js in the layout ?base= takes, the files the add-on pins; usage errors', () =>
  h.inTemp((dir) => {
    const r = node([path.join(h.ROOT, 'tools', 'vendor.js'), 'vend'], dir);
    if (r.code === 1 && offline(r)) throw new h.Skip(`highlight.js ${VERSION} is not cached and could not be fetched`);
    h.assert(r.code === 0, `vendor.js: ${r.err}`);
    const at = (...p) => path.join(dir, 'vend', 'highlight', ...p);
    h.assert(fs.existsSync(at('highlight.min.js')) && fs.readdirSync(at('languages')).some((f) => f.endsWith('.min.js')), 'highlight.js with its languages');
    h.assert(new RegExp(`^highlight\\.js ${VERSION.replace(/\./g, '\\.')} → vend/highlight \\(\\d+ files\\); load it with code\\.js\\?base=vend/highlight$`, 'm').test(r.err), `the base line: ${r.err}`);
    const sri = `sha384-${crypto.createHash('sha384').update(fs.readFileSync(at('highlight.min.js'))).digest('base64')}`;
    h.assert(SRC.includes(sri), 'highlight.min.js is the file the add-on pins');
    h.assert(node([path.join(h.ROOT, 'tools', 'vendor.js')], dir).code === 2, 'DIR missing');
    h.assert(node([path.join(h.ROOT, 'tools', 'vendor.js'), 'a', 'b'], dir).code === 2, 'two DIRs');
    fs.writeFileSync(path.join(dir, 'file.txt'), 'x');
    h.assert(node([path.join(h.ROOT, 'tools', 'vendor.js'), 'file.txt'], dir).code === 2, 'DIR is a file');
  }),
);

h.runTests();
