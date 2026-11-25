/*
  "Add to Home Screen" banner (sits just above the tab bar).

  Shows only on phones/tablets, never when already opened from the home screen.
  Appears on the 2nd visit, or after 30 seconds of use on the first visit.
    iPhone Safari  → how to add it with the Share button
    iPhone, other  → open in Safari first
    Android        → "Install app" button (browser's own install prompt); only
                     shown once the browser says the app can be installed
  ✕ hides it for 7 days. Everything is saved in this browser only.
*/
(function () {
  "use strict";

  const SHOW_AFTER_MS = 30 * 1000;          // first visit: wait this long
  const SECOND_VISIT_DELAY_MS = 3 * 1000;   // later visits: short delay, not instantly
  const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // ✕ hides it this long
  const KEY_VISITS = "pace.installBanner.visits";
  const KEY_CLOSED = "pace.installBanner.closedAt";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  const banner = document.getElementById("install-banner");
  if (!banner) return;

  // Already opened from the home screen.
  const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches)
    || navigator.standalone === true;
  if (standalone) return;

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  if (!isIOS && !isAndroid) return; // desktop

  // Closed with ✕ in the last 7 days.
  const closedAt = Number(store.get(KEY_CLOSED)) || 0;
  if (Date.now() - closedAt < SNOOZE_MS) return;

  // Count visits once per browser session (reloads don't count as a new visit).
  let newSession = true;
  try {
    newSession = !sessionStorage.getItem(KEY_VISITS);
    sessionStorage.setItem(KEY_VISITS, "1");
  } catch { /* sessionStorage unavailable: count every load */ }
  let visits = Number(store.get(KEY_VISITS)) || 0;
  if (newSession) { visits += 1; store.set(KEY_VISITS, String(visits)); }

  const text = banner.querySelector(".install-text");
  const installBtn = banner.querySelector(".install-go");
  const closeBtn = banner.querySelector(".install-close");

  let timeReached = false;
  let deferredPrompt = null; // Android: saved beforeinstallprompt event

  function hide() { banner.hidden = true; }

  function maybeShow() {
    if (!timeReached) return;
    if (isAndroid && !deferredPrompt) return; // nothing to install (yet)
    // Keep it just above the tab bar, whatever its real height.
    const bar = document.querySelector(".tabbar");
    if (bar) banner.style.bottom = bar.offsetHeight + 8 + "px";
    banner.hidden = false;
  }

  if (isIOS) {
    // Safari is the only iPhone browser that isn't marked in the user agent.
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|GSA\/|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok/i.test(ua);
    text.textContent = otherBrowser
      ? "Open in Safari to add to your home screen."
      : "Get Devil Bites on your home screen: tap Share ⬆️ then ‘Add to Home Screen’";
  } else {
    text.textContent = "Get Devil Bites on your home screen.";
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault(); // we show our own banner instead of the browser's mini-bar
      deferredPrompt = e;
      installBtn.hidden = false;
      maybeShow();
    });
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      const prompt = deferredPrompt;
      deferredPrompt = null; // the prompt can only be used once
      hide();
      prompt.prompt();
      try {
        const { outcome } = await prompt.userChoice;
        if (outcome === "dismissed") store.set(KEY_CLOSED, String(Date.now()));
      } catch { /* ignore */ }
    });
    window.addEventListener("appinstalled", hide);
  }

  closeBtn.addEventListener("click", () => {
    store.set(KEY_CLOSED, String(Date.now()));
    hide();
  });

  // When to show: 2nd visit or later → after a short delay; first visit → after
  // 30 seconds with the page open and visible.
  if (visits >= 2) {
    setTimeout(() => { timeReached = true; maybeShow(); }, SECOND_VISIT_DELAY_MS);
  } else {
    let usedMs = 0;
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") usedMs += 1000;
      if (usedMs >= SHOW_AFTER_MS) { clearInterval(tick); timeReached = true; maybeShow(); }
    }, 1000);
  }
})();
