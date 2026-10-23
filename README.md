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

1. Unzip somewhere permanent.
2. **Chrome:** open `chrome://extensions`, enable *Developer mode*, click *Load unpacked*, select this folder.
   **Edge:** open `edge://extensions`, enable *Developer mode*, click *Load unpacked*, select this folder.
3. Click the toolbar icon to configure.

## How it works

`content.js` runs at `document_start` in every frame:

1. **Fonts** are registered with the `FontFace` API from bytes fetched out of the extension package. This works even on sites with a strict Content-Security-Policy (GitHub, Google, banks), where an injected `<style>`/`@font-face` would be blocked. Only the selected font (plus Fast Mono for code) is loaded. Each face uses a Latin-only `unicode-range`, so other scripts and icon glyphs fall back to the page's own font.
2. **Body text**: each element gets an inline `font-family: "<font>", <its original stack> !important`. Headings (`h1`–`h6`) are skipped unless "Also override headings" is on. `pre`/`code`/`kbd`/`samp`/`tt`/`var` use Fast Mono. A `MutationObserver` styles content added later.
3. **Font size**: `font-size: calc(100% * <scale>) !important` is set inline on `<html>`. Most sites use `rem`/`em`, so this scales naturally.

Per-site disable stores hostnames in `chrome.storage.sync.disabledSites`. On those sites nothing is changed.

## Permissions

- `storage`: saves your settings.
- Host access to all sites: needed to restyle text on the pages you visit.

## Files

```
manifest.json    MV3 manifest (Chrome + Edge)
content.js       Loads fonts and applies the overrides on every page
popup.html/.js   Toolbar UI
fonts/           Bundled font files
icons/           Toolbar icons
```

## Support

If Readable Web is useful to you, you can support its development with the
**Buy me a Ko-fi** link in the popup, or directly at
<https://ko-fi.com/eagnespuerto>. Entirely optional and always appreciated.

## Licenses

Bundled font licenses and notices live in [`LICENSES/`](LICENSES/):

- **Atkinson Hyperlegible** — SIL Open Font License 1.1 (Braille Institute) — see `LICENSES/Atkinson-Hyperlegible-OFL.txt`
- **OpenDyslexic** (base for Fast_OpenDyslexic) — SIL Open Font License 1.1 — see `LICENSES/OpenDyslexic-OFL.txt`
- **Fast-Font** — no formal license file upstream; see `LICENSES/Fast-Font-NOTICE.txt`
