#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// code.js in Chromium and Firefox (test/harness.js): fences coloured with
// SRI, a language loaded on first use, plain ones left; a theme's colours
// under a strict policy with data-nonce; ?base= with a local copy; a
// highlight.js that does not load; and a note of 300 fences coloured with
// no long task. highlight.js comes from its local copy (tools/hljs.js), so
// runs are the same each time and work offline after the first.
//
//   LUCCET_ROOT=…/luccet node test/browser.js [--browsers=…] [--filter=TEXT] [--live-cdn]
'use strict';

const fs = require('fs');
const path = require('path');
const h = require('./harness');

const VERSION = /version: '([\d.]+)'/.exec(fs.readFileSync(path.join(h.ROOT, 'code.js'), 'utf8'))[1];
const HLJS_URL = /^https:\/\/cdn\.jsdelivr\.net\/npm\/@highlightjs\/cdn-assets@(\d+\.\d+\.\d+)\/([^?#]+)/;
const hljsDir = (v) => h.cached('highlight.js', require('../tools/hljs').packageDir, v);

// 300 fences in five languages highlight.js's core knows, each after a
// paragraph and each its lines twice; window.__t.render when the note has rendered.
function codeNote(fences = 300) {
  const bodies = {
    js: (i) => [`// Fence ${i}: a small module.`, `export function step${i}(state, input) {`, '  const next = { ...state, count: state.count + 1 };', "  if (typeof input === 'string' && input.length > 3) next.last = input.trim();", '  for (const [k, v] of Object.entries(input || {})) next[k] = v ?? null;', '  return next; /* no side effect */', '}'],
    python: (i) => [`# Fence ${i}: a small function.`, `def step_${i}(state, value=None):`, '    # the next state', '    nxt = dict(state, count=state.get("count", 0) + 1)', '    for k, v in (value or {}).items():', '        nxt[k] = v if v is not None else 0', '    return nxt'],
    css: (i) => [`/* Fence ${i}: a component. */`, `.card-${i} { display: grid; gap: .5rem; }`, `.card-${i} > h2 { font: 700 1.2rem/1.3 var(--font, sans-serif); }`, `@media (min-width: 40rem) { .card-${i} { grid-template-columns: 1fr 2fr; } }`],
    json: (i) => ['{', `  "fence": ${i},`, '  "name": "step",', '  "tags": ["a", "b", "c"],', '  "nested": { "ok": true, "n": 3.5, "none": null }', '}'],
    sql: (i) => [`-- Fence ${i}: a report.`, 'SELECT u.id, u.name, COUNT(o.id) AS orders', 'FROM users u LEFT JOIN orders o ON o.user_id = u.id', `WHERE u.created_at > '2026-01-01' AND u.id % ${i + 1} = 0`, 'GROUP BY u.id, u.name ORDER BY orders DESC LIMIT 20;'],
  };
  const langs = Object.keys(bodies);
  const out = ['<!doctype html><meta charset="utf-8"><script src="/luccet.js" data-use="/code.js"></script>', '', '<script>', '  window.__t = { script: performance.now() };', "  luccet.on('render', () => { window.__t.render = performance.now(); });", '</script>', '', `# A note of ${fences} fences`, ''];
  for (let i = 1; i <= fences; i++) {
    const lang = langs[i % langs.length];
    const lines = bodies[lang](i);
    out.push(`Fence ${i}, in ${lang}: a few lines, twice, so that the page holds a lot of code.`, '', '```' + lang, ...lines, ...lines, '```', '');
  }
  return out.join('\n');
}

const TESTS = [
  {
    name: 'fences coloured by highlight.js with SRI, lines kept, a language loaded on first use, plain ones left',
    url: '/test/pages/code.html',
    async check(page) {
      await page.waitForFunction(() => document.querySelector('code.language-tex [class*="hljs-"]'), null, { timeout: 15000 });
      const r = await page.evaluate(() => {
        const out = {};
        for (const code of document.querySelectorAll('main.luccet pre > code')) {
          out[code.className || 'none'] = {
            spans: code.querySelectorAll('[class*="hljs-"]').length,
            lines: [...code.querySelectorAll(':scope > .t-line')].map((l) => (l.classList.contains('t-hl') ? '*' : '') + l.textContent),
          };
        }
        const kw = document.querySelector('code.language-js .hljs-keyword');
        out.keyword = kw && getComputedStyle(kw).color;
        out.want = getComputedStyle(document.documentElement).getPropertyValue('--t-code-keyword').trim();
        out.comment = [...document.querySelectorAll('code.language-js .t-line')].map((l) => !!l.querySelector('.hljs-comment'));
        out.scripts = [...document.querySelectorAll('script[src*="@highlightjs/"]')].map((e) => ({ src: e.src.replace(/^.*@[\d.]+\//, ''), sri: e.integrity.startsWith('sha384-') }));
        return out;
      });
      const js = r['language-js'];
      const lines = ['// The nth Fibonacci number.', 'function fib(n) {', '*  return n < 2 ? n : fib(n - 1) + fib(n - 2); /* a long', '  comment */', '}'];
      if (JSON.stringify(js.lines) !== JSON.stringify(lines)) throw new Error(`js lines ${JSON.stringify(js.lines)}`);
      if (!js.spans) throw new Error('js has no highlight.js spans');
      if (r.comment.join() !== 'true,false,true,true,false') throw new Error(`the comment spans by line: ${r.comment.join()}, want a comment on lines 1, 3 and 4`);
      if (!r['language-python'].spans || !r['language-tex'].spans) throw new Error(`python ${r['language-python'].spans} spans, tex ${r['language-tex'].spans}`);
      for (const k of ['language-nosuchlang', 'language-text', 'none']) if (r[k].spans) throw new Error(`${k} was coloured`);
      const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
      if (r.keyword !== rgb(r.want)) throw new Error(`a keyword is ${r.keyword}, --t-code-keyword is ${r.want}`);
      const want = ['highlight.min.js', 'languages/latex.min.js'];
      if (JSON.stringify(r.scripts.map((x) => x.src)) !== JSON.stringify(want) || !r.scripts.every((x) => x.sri)) throw new Error(`scripts ${JSON.stringify(r.scripts)}`);
    },
  },
  {
    name: 'a theme colours code, and a strict CSP with data-nonce allows highlight.js',
    url: '/csp-nonce/test/pages/theme.html',
    async check(page) {
      await page.waitForFunction(() => document.querySelector('code.language-haskell [class*="hljs-"]'), null, { timeout: 15000 });
      const r = await page.evaluate(() => {
        const kw = document.querySelector('code.language-js .hljs-keyword');
        return { keyword: getComputedStyle(kw).color, want: getComputedStyle(document.documentElement).getPropertyValue('--t-code-keyword').trim(), csp: window.__csp, nonces: [...document.querySelectorAll('script[src*="@highlightjs/"]')].map((e) => e.nonce) };
      });
      if (r.want !== '#606e00') throw new Error(`--t-code-keyword is ${r.want}, solarized-light.css's is #606e00`);
      if (r.keyword !== 'rgb(96, 110, 0)') throw new Error(`a keyword is ${r.keyword}`);
      if (r.csp.length) throw new Error(`CSP violations: ${r.csp.join('; ')}`);
      if (r.nonces.length !== 2 || !r.nonces.every((n) => n === h.NONCE)) throw new Error(`highlight.js scripts' nonces ${JSON.stringify(r.nonces)}`);
    },
  },
  {
    name: '?base= loads a local copy without SRI',
    url: '/test/pages/base.html',
    async setup(_context, _page, ctx) {
      if (!(await hljsDir(VERSION))) ctx.skip(`no local copy of highlight.js ${VERSION}`);
    },
    async check(page) {
      await page.waitForFunction(() => document.querySelector('code.language-tex [class*="hljs-"]'), null, { timeout: 15000 });
      const r = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((e) => ({ src: new URL(e.src).pathname, sri: !!e.integrity })).filter((x) => x.src.startsWith('/vendor/')));
      const want = ['/vendor/highlightjs/highlight.min.js', '/vendor/highlightjs/languages/latex.min.js'];
      if (JSON.stringify(r.map((x) => x.src)) !== JSON.stringify(want) || r.some((x) => x.sri)) throw new Error(`scripts ${JSON.stringify(r)}`);
      if (!(await page.evaluate(() => document.querySelector('code.language-js [class*="hljs-"]')))) throw new Error('js not coloured');
    },
  },
  {
    name: 'highlight.js that fails to load leaves code plain, with a warning',
    url: '/test/pages/code.html',
    allowConsole: /Failed to load resource|Loading failed for the <script>|integrity|MIME type/i,
    async setup(context) {
      // Routed after the copy's route, so it wins.
      await context.route((url) => HLJS_URL.test(url.href), (route) => route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'text/plain', body: 'not found' }));
    },
    async check(page, ctx) {
      await page.waitForTimeout(500);
      const spans = await page.evaluate(() => document.querySelectorAll('main.luccet [class*="hljs-"]').length);
      if (spans) throw new Error(`${spans} highlight.js spans, though it did not load`);
      if (!(await page.evaluate(() => document.querySelectorAll('main.luccet code.language-js .t-line').length === 5))) throw new Error('the js lines changed');
      if (!ctx.console.some((m) => m.type === 'warning' && /highlight\.js did not load/.test(m.text))) throw new Error(`no warning; console: ${JSON.stringify(ctx.console)}`);
    },
  },
  {
    name: 'no task over 50 ms colouring the 300-fence note, and every fence coloured',
    url: '/gen/code300.html',
    timeout: 60000,
    async setup(_context, page, ctx) {
      if (!(await page.evaluate(() => PerformanceObserver.supportedEntryTypes.includes('longtask')))) ctx.skip(`${ctx.browser} exposes no longtask entries (PerformanceObserver.supportedEntryTypes)`);
    },
    init: () => {
      window.__lt = [];
      window.__loaf = [];
      try {
        new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push({ start: e.startTime, duration: e.duration }))).observe({ type: 'longtask', buffered: true });
      } catch {}
      try {
        new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__loaf.push({ start: e.startTime, duration: e.duration }))).observe({ type: 'long-animation-frame', buffered: true });
      } catch {}
    },
    async check(page, ctx) {
      const SETTLE = 300;
      await h.expect(page, () => [...document.querySelectorAll('main.luccet pre > code')].filter((c) => c.querySelector('[class*="hljs-"]')).length === 300, 'all 300 fences coloured', 30000);
      const done = await page.evaluate(() => performance.now());
      await page.evaluate((ms) => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), ms)), SETTLE);
      const { t, lt, loaf } = await page.evaluate(() => ({ t: window.__t, lt: window.__lt, loaf: window.__loaf }));
      const end = (e) => e.start + e.duration;
      const ms = (x) => `${Math.round(x)} ms`;
      const frame = loaf.find((f) => f.start <= t.render + 1 && t.render <= end(f) + 1);
      const mountTask = lt.find((e) => e.start <= t.render + 1 && t.render <= end(e) + 1);
      const mountEnd = frame ? end(frame) : mountTask ? end(mountTask) : t.render;
      const after = lt.filter((e) => e.start >= mountEnd - 1 && e.start <= done + SETTLE);
      ctx.note(`'render' at ${ms(t.render)}, every fence coloured by ${ms(done)}; long tasks after the mount: ${after.length ? after.map((e) => `${ms(e.start)}+${ms(e.duration)}`).join(', ') : 'none'}`);
      if (after.length) throw new Error(`${after.length} long task(s) while colouring, longest ${ms(Math.max(...after.map((e) => e.duration)))} (budget: none over 50 ms)`);
    },
  },
];

h.runBrowser(TESTS, {
  generated: { 'code300.html': () => ['text/html', codeNote()] },
  // The local copy, for ?base=.
  route: (url) => (url.startsWith('/vendor/highlightjs/') ? path.join(require('../tools/npm').CACHE, `highlightjs-${VERSION}`, path.normalize(url.slice('/vendor/highlightjs/'.length))) : null),
  cdn: [{ re: HLJS_URL, dir: (v) => require('../tools/hljs').packageDir(v) }],
});
