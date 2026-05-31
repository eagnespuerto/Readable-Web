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

const STYLE_ID = "readable-web-style";

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

function buildFontFaceCSS() {
  let css = "";
  for (const def of Object.values(FONTS)) {
    for (const face of def.faces) {
      const url = chrome.runtime.getURL("fonts/" + face.file);
      css += `@font-face {
  font-family: "${def.family}";
  src: url("${url}") format("truetype");
  font-display: swap;
  font-weight: ${face.weight};
  font-style: ${face.style};
  unicode-range: ${LATIN_RANGE};
}
`;
    }
  }
  return css;
}

function buildSizeCSS({ sizePercent }) {
  if (sizePercent && sizePercent !== 100) {
    const scale = (sizePercent / 100).toFixed(4);
    return `html { font-size: calc(100% * ${scale}) !important; }\n`;
  }
  return "";
}

function injectStyle(css) {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = css;
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
    base = getComputedStyle(el).fontFamily || "";
    el.setAttribute(BASE_ATTR, base);
    el.setAttribute(IL_ATTR, el.style.getPropertyValue("font-family"));
    el.setAttribute(ILP_ATTR, el.style.getPropertyPriority("font-family"));
  }
  el.style.setProperty("font-family", `"${family}", ${base}`, "important");
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
  injectStyle(buildFontFaceCSS() + buildSizeCSS(settings));

  if (observer) { observer.disconnect(); observer = null; }
  revertAll();

  const { enabled, fontKey, overrideHeadings } = settings;
  if (!enabled || fontKey === "default" || isSiteDisabled(settings)) return;
  const def = FONTS[fontKey];
  if (!def) return;

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
