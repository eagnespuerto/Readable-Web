// content.js — injects @font-face + override CSS for body fonts and font scaling.

const FONTS = {
  fast_sans: {
    family: "RW Fast Sans",
    faces: [{ file: "Fast_Sans.ttf", weight: "normal", style: "normal" }]
  },
  fast_sans_dotted: {
    family: "RW Fast Sans Dotted",
    faces: [{ file: "Fast_Sans_Dotted.ttf", weight: "normal", style: "normal" }]
  },
  fast_serif: {
    family: "RW Fast Serif",
    faces: [{ file: "Fast_Serif.ttf", weight: "normal", style: "normal" }]
  },
  fast_mono: {
    family: "RW Fast Mono",
    faces: [{ file: "Fast_Mono.ttf", weight: "normal", style: "normal" }]
  },
  fast_opendyslexic: {
    family: "RW Fast OpenDyslexic",
    faces: [{ file: "Fast_OpenDyslexic.ttf", weight: "normal", style: "normal" }]
  },
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

const DEFAULTS = {
  enabled: true,
  fontKey: "default",
  sizePercent: 100,
  overrideHeadings: false,
  disabledSites: []
};

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
}
`;
    }
  }
  return css;
}

function buildOverrideCSS({ enabled, fontKey, sizePercent, overrideHeadings }) {
  let css = "";

  if (sizePercent && sizePercent !== 100) {
    const scale = (sizePercent / 100).toFixed(4);
    css += `html { font-size: calc(100% * ${scale}) !important; }\n`;
  }

  if (!enabled || fontKey === "default") return css;

  const def = FONTS[fontKey];
  if (!def) return css;

  const selector = overrideHeadings
    ? ":root *"
    : ":root :not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not(h1 *):not(h2 *):not(h3 *):not(h4 *):not(h5 *):not(h6 *)";

  let fallback = "sans-serif";
  if (fontKey === "fast_serif") fallback = "serif";
  if (fontKey === "fast_mono")  fallback = "monospace";

  css += `${selector} {
  font-family: "${def.family}", ${fallback} !important;
}
pre, pre *, code, code *, kbd, samp, tt, var {
  font-family: "RW Fast Mono", monospace !important;
}
`;

  return css;
}

function isSiteDisabled(settings) {
  try {
    return (settings.disabledSites || []).includes(location.hostname);
  } catch (e) {
    return false;
  }
}

function applySettings(settings) {
  let css = buildFontFaceCSS();
  if (!isSiteDisabled(settings)) {
    css += buildOverrideCSS(settings);
  }
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(styleEl);
  }
  styleEl.textContent = css;
}

chrome.storage.sync.get(DEFAULTS, applySettings);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, applySettings);
});
