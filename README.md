# Code highlighting for Luccet

`code.js` colours the code in a [Luccet](https://luccet.dev) note by its language, with [highlight.js](https://highlightjs.org): keywords, strings, comments, numbers, function and type names. Every fence that names its language is coloured, in the page theme's colours. Load it and write fences as usual: nothing else changes.

## Loading it

It needs Luccet 2, the [add-on API](https://luccet.dev/docs/addon-api.html) 2 (`luccet.api`). List it in `data-use` on the luccet.js tag:

````html
<!doctype html><meta charset="utf-8"><script src="luccet.js" data-use="https://cdn.luccet.dev/code/v1/code.js"></script>

# Fibonacci

```js {lines hl=3}
// The nth Fibonacci number.
function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
```
````

or in a `:::use` block, one entry per line, which must come first in the note (after `:::meta` at most):

```html
<!doctype html><meta charset="utf-8"><script src="luccet.js"></script>

:::use
https://cdn.luccet.dev/themes/v1/nord.css
https://cdn.luccet.dev/code/v1/code.js
:::
```

- **From cdn.luccet.dev,** `v1/` is the newest 1.x release of this add-on, checked for a newer one every hour; a release's own folder, such as `v1.0.0/`, never changes, and browsers keep it a year. jsDelivr serves the same tags: `https://cdn.jsdelivr.net/gh/Luccet/code@1/code.js`.
- **A copy of your own:** put `code.js` beside your notes and list it by its path, `data-use="code.js"`.
- **Options** go in the add-on's query string, `code.js?base=vendor/highlight`, or in `window.LUCCET = {use: {code: {…}}}` in a head script ([options](https://luccet.dev/docs/schema.html#use-options)). There is one, `base` (below).

How add-ons load, and how to write one: [Add-ons](https://luccet.dev/docs/schema.html#addons).

## Which fences

- **A fence that names its language,** by name or by alias: ```` ```js ````, ```` ```python ````, ```` ```tex ````. Titled fences ([listings](https://luccet.dev/docs/guide.html#listings)) are coloured too.
- **Left as they are:** a fence with no language; one marked `text`, `txt`, `plaintext`, `nohighlight` or `no-highlight`; one in a language highlight.js does not know, such as `luccet`. Inline code is never coloured.
- **Line numbers and highlighted lines stay.** `{lines hl=3}` works as it does without the add-on: the coloured text is split back into the lines, and a comment that runs over two lines is coloured on both.
- **The text does not change.** The add-on only wraps it in `<span class="hljs-…">` elements, so copying code copies the same text.
- **In slices, after the note shows.** The fences are coloured a few at a time, 10 ms of work per frame, so a page of hundreds of fences stays responsive while it colours them. Printing colours what is left first.

## Languages

- **36 languages load with the add-on,** highlight.js's common bundle: bash, c, cpp, csharp, css, diff, go, graphql, ini, java, javascript, json, kotlin, less, lua, makefile, markdown, objectivec, perl, php, php-template, plaintext, python, python-repl, r, ruby, rust, scss, shell, sql, swift, typescript, vbnet, wasm, xml and yaml, with their aliases (`js`, `py`, `sh`, `html` …).
- **157 more load the first time a note uses one,** each a small file: latex (`tex`), haskell (`hs`), scala, elixir, julia, matlab, ocaml, dockerfile, nginx, powershell and the rest of [highlight.js's languages](https://highlightjs.readthedocs.io/en/latest/supported-languages.html).
- **An alias two languages share is not used:** `ls` is both Lasso and LiveScript, so write `lasso` or `livescript`.

## Colours

The add-on maps highlight.js's classes onto ten [custom properties](https://luccet.dev/docs/schema.html#custom-properties). A [theme](https://github.com/Luccet/themes) sets them. Without one, the add-on's defaults apply: a light set, and a dark set when the reader prefers dark.

| Property | Colours |
|---|---|
| `--t-code-comment` | comments, in italics |
| `--t-code-keyword` | keywords, tag names |
| `--t-code-string` | strings, regular expressions |
| `--t-code-number` | numbers, literals such as `true` and `null` |
| `--t-code-function` | function names, section titles |
| `--t-code-type` | types, class names, built-ins |
| `--t-code-variable` | variables, attributes, properties |
| `--t-code-meta` | preprocessor lines, doctypes, prompts |
| `--t-code-inserted` | added lines in a diff |
| `--t-code-deleted` | removed lines in a diff |

- **A theme's colours win,** whatever the order the stylesheets load in: the defaults are set under `:where(:root)`, which has no specificity.
- **Print** uses the light defaults, whatever the theme, so code prints dark on white paper.
- **Your own colours:** set the properties in your CSS, as for any custom property ([overriding them](https://luccet.dev/docs/schema.html#overriding)), or style highlight.js's classes (`.hljs-keyword` …) directly:

```html
<!doctype html><meta charset="utf-8"><style>
:root { --t-code-keyword: #8250df; }
.hljs-comment { font-style: normal; }
</style><script src="luccet.js" data-use="https://cdn.luccet.dev/code/v1/code.js"></script>
```

The [Mermaid add-on](https://github.com/Luccet/mermaid) reads these colours too, for its diagrams' categories.

## How it loads

- **From jsDelivr.** The add-on asks for highlight.js 11.12.0 as soon as it runs, alongside the other add-ons, pinned with [SRI](https://luccet.dev/docs/publishing.html#csp) hashes. Code shows plain until it arrives, then turns coloured.
- **A copy of your own,** for offline use or a strict policy: `?base=` names the folder of `highlight.min.js` and `languages/`, the layout of the npm package `@highlightjs/cdn-assets`, relative to the page. A copy is loaded without SRI. `tools/vendor.js` writes one (below).
- **Content-Security-Policy.** Allow `https://cdn.luccet.dev` (the add-on) and `https://cdn.jsdelivr.net` (highlight.js) in `script-src`, or use copies. With [`data-nonce`](https://luccet.dev/docs/publishing.html#csp), the add-on's scripts carry the nonce.
- **A highlight.js already on the page** is used as it is, with the languages it has: the add-on loads none for it.
- **If highlight.js does not load,** code stays plain, and the console shows a warning.
- **Without the page.** `luccet check` and `luccet build` run the add-on (a copy of your own; one from a URL is not loaded under node) and colour nothing: a built page is coloured when `luccet.js` runs on it, and without JavaScript code shows plain.

## A local highlight.js

In a clone of this repository, `node tools/vendor.js DIR` writes highlight.js, at the version `code.js` pins, to `DIR/highlight/` (`highlight.min.js` and `languages/`), and prints the `?base=` to load it with. `node tools/vendor.js vendor` writes `vendor/highlight/`:

```html
<!doctype html><meta charset="utf-8"><script src="luccet.js" data-use="code.js?base=vendor/highlight"></script>
```

`?base=` is relative to the page, so write the copy beside your notes (`node tools/vendor.js ~/notes/vendor`) or move it there. The package comes from the npm registry, checked against its hash, once: it is kept in `node_modules/.cache/luccet-smoke/`.

## A newer highlight.js

The version and its hashes live in a table in `code.js`, written by `tools/hljs.js`. To move to another version, run `node tools/hljs.js VERSION`: it downloads the package from the npm registry once, checks it, and rewrites the table. `node tools/hljs.js --check` exits 1 when the table is not the pinned version's.

The tools need Node 18 or later, and the network once per version.

## Tests

`npm test` runs the add-on's tests: `test/node.js` under Node, with the engine's command line, and `test/browser.js` in Chromium and Firefox through [Playwright](https://playwright.dev). They run against a checkout of the engine, [Luccet/luccet](https://github.com/Luccet/luccet): `LUCCET_ROOT` names it, else `../luccet` beside this repository.

```sh
npm install && npx playwright install chromium firefox
LUCCET_ROOT=../luccet npm test
node test/browser.js --browsers=firefox --filter=WORDS   # some of them
```

CI runs them on every push and every Monday, against the engine's `main` and its latest release. `test/harness.js`, `tools/npm.js` and `.github/workflows/test.yml` are the same in every add-on's repository.

## License

MIT, as [LICENSE](LICENSE) says.
