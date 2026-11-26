/*
  Anonymous usage counts with GoatCounter (dashboard: devilbites.goatcounter.com).
  The GoatCounter script tag in index.html counts page visits; this file adds
  custom events.

    DevilBitesTrack("search")   → one "search" event

  Only fixed event names are ever sent: never balances, item names, search
  text or anything else a person typed. If GoatCounter is blocked (ad blocker,
  offline) events are quietly dropped and the app works as normal.
*/
(function () {
  "use strict";

  const queue = [];
  let waited = 0;
  let timer = null;

  const ready = () => window.goatcounter && typeof window.goatcounter.count === "function";

  function send(name) {
    try { window.goatcounter.count({ path: name, title: name, event: true }); } catch { /* ignore */ }
  }

  // The GoatCounter script loads async, so hold events until it's there (up to 15 s).
  function flushLater() {
    if (timer) return;
    timer = setInterval(() => {
      waited += 500;
      if (ready()) { clearInterval(timer); timer = null; queue.splice(0).forEach(send); }
      else if (waited >= 15000) { clearInterval(timer); timer = null; queue.length = 0; }
    }, 500);
  }

  window.DevilBitesTrack = function (name) {
    if (!name) return;
    if (ready()) send(name);
    else { queue.push(name); flushLater(); }
  };

  // ?src=something → "src-something", once per visit (browser session).
  try {
    const raw = new URLSearchParams(location.search).get("src");
    const src = (raw || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    if (src) {
      let seen = false;
      try { seen = sessionStorage.getItem("pace.src") === src; sessionStorage.setItem("pace.src", src); } catch { /* count it */ }
      if (!seen) window.DevilBitesTrack("src-" + src);
    }
  } catch { /* ignore */ }
})();
