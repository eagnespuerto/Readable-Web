const DEFAULTS = {
  enabled: true,
  fontKey: "default",
  sizePercent: 100,
  overrideHeadings: false,
  disabledSites: []
};

const els = {
  enabled: document.getElementById("enabled"),
  fontKey: document.getElementById("fontKey"),
  size: document.getElementById("size"),
  sizeVal: document.getElementById("sizeVal"),
  overrideHeadings: document.getElementById("overrideHeadings"),
  siteHost: document.getElementById("siteHost"),
  siteState: document.getElementById("siteState"),
  siteStatus: document.getElementById("siteStatus"),
  toggleSite: document.getElementById("toggleSite"),
  reset: document.getElementById("reset")
};

let currentHost = null;

function hostFromUrl(url) {
  try { return new URL(url).hostname; } catch (e) { return null; }
}

function render(settings) {
  els.enabled.checked = !!settings.enabled;
  els.fontKey.value = settings.fontKey;
  els.size.value = settings.sizePercent;
  els.sizeVal.textContent = settings.sizePercent + "%";
  els.overrideHeadings.checked = !!settings.overrideHeadings;

  const disabled = currentHost && (settings.disabledSites || []).includes(currentHost);
  els.siteHost.textContent = currentHost || "(no site)";
  if (disabled) {
    els.siteStatus.classList.add("disabled");
    els.siteState.textContent = "(disabled)";
    els.toggleSite.textContent = "Enable on this site";
  } else {
    els.siteStatus.classList.remove("disabled");
    els.siteState.textContent = "(active)";
    els.toggleSite.textContent = "Disable on this site";
  }
  els.toggleSite.disabled = !currentHost;
}

function save(partial) {
  chrome.storage.sync.set(partial);
}

// Get current tab's host, then load settings.
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs && tabs[0]) currentHost = hostFromUrl(tabs[0].url);
  chrome.storage.sync.get(DEFAULTS, render);
});

els.enabled.addEventListener("change", () => save({ enabled: els.enabled.checked }));
els.fontKey.addEventListener("change", () => save({ fontKey: els.fontKey.value }));
els.size.addEventListener("input", () => {
  const v = parseInt(els.size.value, 10);
  els.sizeVal.textContent = v + "%";
  save({ sizePercent: v });
});
els.overrideHeadings.addEventListener("change", () =>
  save({ overrideHeadings: els.overrideHeadings.checked })
);

document.querySelectorAll(".preset-row button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const v = parseInt(btn.dataset.size, 10);
    els.size.value = v;
    els.sizeVal.textContent = v + "%";
    save({ sizePercent: v });
  });
});

els.toggleSite.addEventListener("click", () => {
  if (!currentHost) return;
  chrome.storage.sync.get(DEFAULTS, (settings) => {
    const list = new Set(settings.disabledSites || []);
    if (list.has(currentHost)) list.delete(currentHost);
    else list.add(currentHost);
    chrome.storage.sync.set({ disabledSites: [...list] }, () => {
      chrome.storage.sync.get(DEFAULTS, render);
    });
  });
});

els.reset.addEventListener("click", () => {
  chrome.storage.sync.set(DEFAULTS, () => render(DEFAULTS));
});

// Live-refresh popup if storage changes elsewhere.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, render);
});
