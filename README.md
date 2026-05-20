# Readable Web

A Chrome / Edge extension (Manifest V3) that overrides body text on every site with a more readable font, and scales font size as a percentage.

## Fonts included

| Option | Description |
|---|---|
| **Fast Sans** | Sans-serif with bionic-reading bolded initial letters |
| **Fast Sans Dotted** | Same as Fast Sans, with dotted fixation marks |
| **Fast Serif** | Serif variant with bionic styling |
| **Fast OpenDyslexic** | OpenDyslexic with bionic styling |
| **Atkinson Hyperlegible** | Braille Institute font for low-vision readers (regular, bold, italic, bold-italic) |

## Features

- Pick a body font from the popup.
- Scale font size 75%–200% (slider + 100/110/125/150 presets).
- **Headings** (`h1`–`h6`) are preserved by default; toggle "Also override headings" to override them too.
- **Per-site disable**: one click to turn the extension off for the current domain. Stored as an allow-list so it survives across sessions.
- Code/`pre`/`kbd` always stay monospace (Fast Mono).
- Settings live in `chrome.storage.sync`, so they apply across all signed-in browsers.

## Install
Web Store Link: https://chromewebstore.google.com/detail/aihpbccedbdfbdkcflhlochhngapnclh?utm_source=item-share-cb

For manual install: 
1. Unzip somewhere permanent.
2. **Chrome:** open `chrome://extensions`, enable *Developer mode*, click *Load unpacked*, select this folder.
   **Edge:** open `edge://extensions`, enable *Developer mode*, click *Load unpacked*, select this folder.
3. Click the toolbar icon to configure.

## How it works

`content.js` runs at `document_start` and injects a single `<style>` element containing:

1. `@font-face` declarations pointing at the bundled font files via `chrome.runtime.getURL`. Atkinson registers four faces (regular/bold/italic/bold-italic) so italics and bold text on the page still render correctly.
2. A universal-selector override:
   - Default: `:root :not(h1):not(h2)...` so headings keep their original cascade.
   - With "override headings" on: `:root *`.
   `!important` is used to beat site-level rules.
3. Font-size scaling via `html { font-size: calc(100% * <scale>) !important }`. Because most sites use `rem`/`em`, this cascades naturally instead of breaking layouts the way a forced `body { font-size: Xpx }` would.
4. A separate rule keeping `pre`/`code`/`kbd`/`samp`/`tt`/`var` in monospace (Fast Mono).

Per-site disable works by storing a list of hostnames in `chrome.storage.sync.disabledSites`. When the page's `location.hostname` is in that list, only `@font-face` declarations are injected — no overrides — so the extension is effectively dormant on that site.

## Files

```
manifest.json    MV3 manifest (Chrome + Edge)
content.js       Injects @font-face + override CSS into every page
popup.html/.js   Toolbar UI
fonts/           Bundled font files
icons/           Toolbar icons
```

## Licenses

Bundled font licenses and notices live in [`LICENSES/`](LICENSES/):

- **Atkinson Hyperlegible** — SIL Open Font License 1.1 (Braille Institute) — see `LICENSES/Atkinson-Hyperlegible-OFL.txt`
- **OpenDyslexic** (base for Fast_OpenDyslexic) — SIL Open Font License 1.1 — see `LICENSES/OpenDyslexic-OFL.txt`
- **Fast-Font** — no formal license file upstream; see `LICENSES/Fast-Font-NOTICE.txt`
