// content.js — applies override fonts while PRESERVING each element's original
// font stack as the fallback. Combined with the per-font unicode-range, the
// custom font is used only for Latin; non-Latin chars (Cyrillic, Greek, CJK,
// Arabic, Hebrew, icon/PUA glyphs, etc.) render in the page's own font.

const FONTS = {
  fast_sans:        { family: "RW Fast Sans",          faces: [{ file: "Fast_Sans.ttf",        weight: "normal", style: "normal" }] },
  fast_sans_dotted: { family: "RW Fast Sans Dotted",   faces: [{ file: "Fast_Sans_Dotted.ttf", weight: "normal", style: "normal" }] },
  fast_serif:       { family: "RW Fast Serif",         faces: [{ file: "Fast_Serif.ttf",       weight: "normal", style: "normal" }] },
  fast_mono:        { family: "RW Fast Mono",          faces: [{ file: "Fast_Mono.ttf",         weight: "normal", style: "normal" }] },
  fast_opendyslexic:{ family: "RW Fast OpenDyslexic",  faces: [{ file: "Fast_OpenDyslexic.ttf", weight: "normal", style: "normal" }] },
  atkinson: {
    family: "RW Atkinson Hyperlegible",
    faces: [
      { file: "AtkinsonHyperlegible-Regular.ttf",    weight: "normal", style: "normal" },
      { file: "AtkinsonHyperlegible-Bold.ttf",       weight: "bold",   style: "normal" },
      { file: "AtkinsonHyperlegible-Italic.ttf",     weight: "normal", style: "italic" },
      { file: "AtkinsonHyperlegible-BoldItalic.ttf", weight: "bold",   style: "italic" }
    ]
  }
};


// Latin + common punctuation/symbols/currency only. Everything else falls
// through to the element's preserved original font.
const LATIN_RANGE =
  "U+0000-024F, U+0259, U+1E00-1EFF, U+2000-206F, U+2070-209F, " +
  "U+20A0-20CF, U+2100-214F, U+2C60-2C7F, U+A720-A7FF, U+FB00-FB06, U+FFFD";

const APPLIED   = "data-rw-font";   // marks elements we've styled + which family
const BASE_ATTR = "data-rw-base";   // the element's original resolved font stack
const IL_ATTR   = "data-rw-il";     // any pre-existing inline font-family value
const ILP_ATTR  = "data-rw-ilp";    // its priority (e.g. "important")
const MONO_SEL  = "pre, pre *, code, code *, kbd, samp, tt, var";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);

const DEFAULTS = {
  enabled: true,
  fontKey: "default",
  sizePercent: 100,
  overrideHeadings: false,
  disabledSites: []
};

let observer = null;

// Fonts are registered with the FontFace API from bytes fetched out of the
// extension package. A <style> with @font-face would be blocked on sites whose
// Content-Security-Policy restricts style-src / font-src (GitHub, many banks,
// Google properties), which made the font silently fall back to the site's own.
const loadedFamilies = new Map(); // family -> Promise

function loadFamily(def) {
  if (loadedFamilies.has(def.family)) return loadedFamilies.get(def.family);
  const p = Promise.all(def.faces.map(async (face) => {
    const res = await fetch(chrome.runtime.getURL("fonts/" + face.file));
    const buf = await res.arrayBuffer();
    const ff = new FontFace(def.family, buf, {
      weight: face.weight,
      style: face.style,
      display: "swap",
      unicodeRange: LATIN_RANGE
    });
    await ff.load();
    document.fonts.add(ff);
  })).catch((err) => {
    loadedFamilies.delete(def.family); // allow a retry on the next apply
    console.warn("[Readable Web] could not load font", def.family, err);
  });
  loadedFamilies.set(def.family, p);
  return p;
}

// Font size is set as an inline style on <html> (CSSOM, not blocked by CSP).
const SIZE_ATTR  = "data-rw-size";
const SIZE_IL    = "data-rw-size-il";
const SIZE_ILP   = "data-rw-size-ilp";

function applySize(sizePercent, active) {
  const root = document.documentElement;
  if (root.hasAttribute(SIZE_ATTR)) {
    const il = root.getAttribute(SIZE_IL) || "";
    const ilp = root.getAttribute(SIZE_ILP) || "";
    if (il) root.style.setProperty("font-size", il, ilp);
    else    root.style.removeProperty("font-size");
    root.removeAttribute(SIZE_ATTR);
    root.removeAttribute(SIZE_IL);
    root.removeAttribute(SIZE_ILP);
  }
  if (!active || !sizePercent || sizePercent === 100) return;
  root.setAttribute(SIZE_IL, root.style.getPropertyValue("font-size"));
  root.setAttribute(SIZE_ILP, root.style.getPropertyPriority("font-size"));
  root.setAttribute(SIZE_ATTR, String(sizePercent));
  const scale = (sizePercent / 100).toFixed(4);
  root.style.setProperty("font-size", `calc(100% * ${scale})`, "important");
}

function isSiteDisabled(settings) {
  try { return (settings.disabledSites || []).includes(location.hostname); }
  catch (e) { return false; }
}

function familyFor(el, def, overrideHeadings) {
  if (!overrideHeadings && el.closest("h1,h2,h3,h4,h5,h6")) return null;
  if (el.matches(MONO_SEL)) return FONTS.fast_mono.family;
  return def.family;
}

function applyFont(el, family) {
  // Capture the original stack ONCE so re-applies and switches stay clean.
  let base = el.getAttribute(BASE_ATTR);
  if (base === null) {
    // Drop our own families inherited from an already-styled parent.
    base = (getComputedStyle(el).fontFamily || "")
      .split(",").map((s) => s.trim())
      .filter((s) => s && !/^["']?RW /.test(s)).join(", ");
    el.setAttribute(BASE_ATTR, base);
    el.setAttribute(IL_ATTR, el.style.getPropertyValue("font-family"));
    el.setAttribute(ILP_ATTR, el.style.getPropertyPriority("font-family"));
  }
  el.style.setProperty("font-family", base ? `"${family}", ${base}` : `"${family}"`, "important");
  el.setAttribute(APPLIED, family);
}

function revertAll() {
  for (const el of document.querySelectorAll("[" + APPLIED + "]")) {
    const il  = el.getAttribute(IL_ATTR) || "";
    const ilp = el.getAttribute(ILP_ATTR) || "";
    if (il) el.style.setProperty("font-family", il, ilp);
    else    el.style.removeProperty("font-family");
    el.removeAttribute(APPLIED);
    el.removeAttribute(BASE_ATTR);
    el.removeAttribute(IL_ATTR);
    el.removeAttribute(ILP_ATTR);
  }
}

function walk(root, def, overrideHeadings) {
  const els = [];
  if (root.nodeType === 1 && !SKIP_TAGS.has(root.tagName)) els.push(root);
  if (root.querySelectorAll) {
    for (const el of root.querySelectorAll("*")) {
      if (!SKIP_TAGS.has(el.tagName)) els.push(el);
    }
  }
  for (const el of els) {
    const fam = familyFor(el, def, overrideHeadings);
    if (fam) applyFont(el, fam);
  }
}

function applySettings(settings) {
  if (observer) { observer.disconnect(); observer = null; }
  revertAll();

  const { enabled, fontKey, overrideHeadings } = settings;
  const siteOn = !isSiteDisabled(settings);
  // Size scaling keeps its old behaviour (independent of the font toggle),
  // but now also switches off on sites the user disabled, as the README says.
  applySize(settings.sizePercent, siteOn);

  if (!enabled || !siteOn || fontKey === "default") return;
  const def = FONTS[fontKey];
  if (!def) return;
  loadFamily(def);
  loadFamily(FONTS.fast_mono);

  const run = () => {
    walk(document.documentElement, def, overrideHeadings);
    observer = new MutationObserver((muts) => {
      for (const m of muts)
        for (const n of m.addedNodes)
          if (n.nodeType === 1) walk(n, def, overrideHeadings);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.body) run();
  else document.addEventListener("DOMContentLoaded", run, { once: true });
}

chrome.storage.sync.get(DEFAULTS, applySettings);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, applySettings);
});
