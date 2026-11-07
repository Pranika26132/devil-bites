(function () {
  "use strict";

  const { locations, items, prices } = window.PACE_DATA;
  const WEEKS_PER_SEMESTER = 15;
  const POPULAR = ["Bubbl’r sparkling water", "Barebells protein bar", "Clif Bar", "Oikos yogurt", "Poppi", "Chickpea stew"];

  // ── Build one record per item, with all its price entries ──
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[’'`!.]/g, "")
      .replace(/&/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const catalog = Object.entries(items).map(([name, info]) => ({
    name,
    category: info.category,
    entries: [],
    names: [name, ...(info.aka || [])].map(norm),
    extra: "",
  }));
  const byName = new Map(catalog.map((it) => [it.name, it]));

  for (const p of prices) {
    const it = byName.get(p.item);
    if (!it) { console.warn("Pace: price for unknown item", p.item); continue; }
    if (p.loc && !locations[p.loc]) console.warn("Pace: unknown location", p.loc);
    it.entries.push(p);
    it.extra += " " + norm(p.flavors);
  }
  catalog.forEach((it) => (it.extra = it.extra.trim()));

  // ── Search ──
  function score(it, q) {
    const qc = q.replace(/ /g, "");
    let best = 0;
    for (const n of it.names) {
      if (n === q) return 100;
      const nc = n.replace(/ /g, "");
      if (n.startsWith(q) || nc.startsWith(qc)) best = Math.max(best, 80);
      else if (n.split(" ").some((w) => w.startsWith(q))) best = Math.max(best, 60);
      else if (qc.length > 2 && nc.includes(qc)) best = Math.max(best, 50);
      else if (q.split(" ").every((t) => n.split(" ").some((w) => w.startsWith(t)))) best = Math.max(best, 40);
    }
    if (!best && q.length > 2 && q.split(" ").every((t) => it.extra.includes(t))) best = 10; // flavor match
    return best;
  }

  function search(raw) {
    const q = norm(raw);
    if (!q) return [];
    return catalog
      .map((it) => ({ it, s: score(it, q) }))
      .filter((r) => r.s > 0 && r.it.entries.length)
      .sort((a, b) => b.s - a.s || a.it.name.localeCompare(b.it.name, undefined, { numeric: true }))
      .map((r) => r.it);
  }

  // ── Formatting ──
  const money = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const shortDate = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${MONTHS[m - 1]} ${d}`; };
  const locName = (id) => (id ? locations[id].name : "Location not recorded");
  const joinNames = (arr) => arr.length <= 2 ? arr.join(" or ") : `${arr.slice(0, -1).join(", ")} or ${arr.at(-1)}`;

  // Splits an item's entries into the groups the detail screen shows.
  function analyze(it) {
    const known = it.entries.filter((e) => e.loc);
    const priced = known.filter((e) => e.price != null).sort((a, b) => a.price - b.price);
    const unpriced = known.filter((e) => e.price == null);
    const noLoc = it.entries.filter((e) => !e.loc).sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    const min = priced.length ? priced[0].price : null;
    const max = priced.length ? priced.at(-1).price : null;
    return { known, priced, unpriced, noLoc, min, max, hasCompare: priced.length > 1 && max > min };
  }

  // ── Rendering ──
  const $results = document.getElementById("results");
  const $q = document.getElementById("q");
  const $clear = document.getElementById("clear");

  function metaLine(e, extra) {
    const loc = e.loc && locations[e.loc];
    const bits = [];
    if (loc && loc.area) bits.push(loc.area);
    if (e.size) bits.push(e.size);
    if (e.flavors) bits.push(e.flavors);
    if (e.checked) bits.push(`checked ${shortDate(e.checked)}`);
    let html = bits.length ? esc(bits.join(" · ")) : "";
    if (extra) html += (html ? "<br>" : "") + extra;
    if (e.note) html += (html ? "<br>" : "") + `<span class="note">${esc(e.note)}</span>`;
    return html ? `<p class="meta">${html}</p>` : "";
  }

  function priceCard(e, isBest) {
    const unpriced = e.price == null;
    return `
      <article class="card${isBest ? " best" : ""}${unpriced ? " unpriced" : ""}">
        <div class="card-main">
          <p class="place">${esc(locName(e.loc))}</p>
          ${isBest ? `<p class="best-label">Best price</p>` : ""}
          ${metaLine(e, unpriced ? "Price not confirmed yet" : "")}
        </div>
        <span class="price">${unpriced ? "—" : money(e.price)}</span>
      </article>`;
  }

  function renderDetail(it, { showBack } = {}) {
    const a = analyze(it);
    const isMeal = it.category === "Meals";
    const n = new Set(a.known.map((e) => e.loc)).size;
    let html = "";

    if (showBack) html += `<button class="back" type="button" data-back>‹ All results</button>`;
    html += `<h2 class="item-name">${esc(it.name)}</h2>`;
    if (n) html += `<p class="count">${n} ${n === 1 ? "place" : "places"} ${isMeal ? "serve" : "sell"} this</p>`;
    else html += `<p class="count">Where it’s sold hasn’t been recorded yet</p>`;

    if (a.priced.length || a.unpriced.length) {
      html += `<div class="cards">`;
      html += a.priced.map((e) => priceCard(e, a.hasCompare && e.price === a.min)).join("");
      html += a.unpriced.map((e) => priceCard(e, false)).join("");
      html += `</div>`;
    }

    if (a.hasCompare) {
      const cheap = joinNames([...new Set(a.priced.filter((e) => e.price === a.min).map((e) => locName(e.loc)))]);
      const priceyNames = [...new Set(a.priced.filter((e) => e.price === a.max).map((e) => locName(e.loc)))];
      const pricey = priceyNames.length > 1 && priceyNames.every((n) => / vending$/.test(n)) ? "vending"
        : priceyNames.length > 2 ? "the other spots" : joinNames(priceyNames);
      const diff = a.max - a.min;
      if (isMeal) {
        html += `<div class="tip"><p class="tip-title">You save about ${money(Math.round(diff))}</p>
                 <p>Getting it at ${esc(cheap)} instead of ${esc(pricey)}.</p></div>`;
      } else {
        const semester = Math.round(diff * 3 * WEEKS_PER_SEMESTER);
        html += `<div class="tip"><p class="tip-title">Buy 3 a week?</p>
                 <p>${esc(cheap)} instead of ${esc(pricey)} saves about ${money(semester)} a semester.</p></div>`;
      }
    } else if (a.priced.length === 1) {
      html += `<p class="single">Only one spot checked so far.</p>`;
    } else if (a.priced.length > 1) {
      html += `<p class="single">Same price everywhere we’ve checked.</p>`;
    }

    if (a.noLoc.length) {
      html += `<p class="section-label">Spot not recorded</p><div class="cards">`;
      html += a.noLoc.map((e) => priceCard(e, false)).join("");
      html += `</div>`;
    }

    $results.innerHTML = html;
  }

  function renderList(list) {
    let html = `<p class="count">${list.length} items match</p><div class="cards">`;
    for (const it of list) {
      const a = analyze(it);
      const places = new Set(a.known.map((e) => e.loc)).size;
      const allPrices = it.entries.filter((e) => e.price != null).map((e) => e.price);
      const low = allPrices.length ? Math.min(...allPrices) : null;
      const sub = places ? `${places} ${places === 1 ? "place" : "places"}` : "Spot not recorded";
      html += `
        <button type="button" class="card match" data-item="${esc(it.name)}">
          <span class="card-main">
            <p class="place">${esc(it.name)}</p>
            <p class="meta">${sub}${a.hasCompare ? " · prices differ" : ""}</p>
          </span>
          <span class="from">
            ${low == null ? `<span class="meta">No price yet</span>` :
              `<small>${a.priced.length > 1 ? "from" : ""}</small><span class="price">${money(low)}</span>`}
          </span>
        </button>`;
    }
    $results.innerHTML = html + `</div>`;
  }

  function renderStart() {
    const spots = new Set(prices.filter((p) => p.loc).map((p) => p.loc)).size;
    const count = prices.filter((p) => p.price != null).length;
    $results.innerHTML = `
      <p class="start-hint">See every spot’s price, with the cheapest highlighted.</p>
      <div class="chips">
        ${POPULAR.filter((n) => byName.has(n)).map((n) => `<button type="button" class="chip" data-item="${esc(n)}">${esc(n)}</button>`).join("")}
      </div>
      <p class="footnote">${count} prices from ${spots} spots on campus · student checks, Oct–Nov 2026</p>`;
  }

  function renderEmpty(raw) {
    $results.innerHTML = `
      <div class="empty"><strong>No prices for “${esc(raw.trim())}” yet.</strong><br>
      Try a brand name, like “Clif” or “Red Bull”.</div>`;
  }

  // ── State ──
  let lastList = [];

  function update() {
    const raw = $q.value;
    $clear.hidden = !raw;
    if (!norm(raw)) return renderStart();
    const list = search(raw);
    lastList = list;
    if (!list.length) return renderEmpty(raw);
    const exact = list.filter((it) => it.names.includes(norm(raw)));
    if (list.length === 1) return renderDetail(list[0]);
    if (exact.length === 1) return renderDetail(exact[0], { showBack: true });
    renderList(list);
  }

  $q.addEventListener("input", update);
  $q.addEventListener("keydown", (e) => { if (e.key === "Enter") $q.blur(); });
  $clear.addEventListener("click", () => { $q.value = ""; update(); $q.focus(); });

  // Shows one item's full comparison on the Search screen.
  function openItem(it) {
    $q.value = it.name;
    $clear.hidden = false;
    lastList = [it];
    renderDetail(it);
    showView("search");
    $viewSearch.scrollTop = 0;
  }

  $results.addEventListener("click", (e) => {
    const target = e.target.closest("[data-item], [data-back]");
    if (!target) return;
    if (target.hasAttribute("data-back")) {
      renderList(lastList.length ? lastList : search($q.value));
      return;
    }
    const it = byName.get(target.dataset.item);
    if (!it) return;
    if (target.classList.contains("chip")) openItem(it);
    else { renderDetail(it, { showBack: true }); $viewSearch.scrollTop = 0; }
  });

  // ── Browse ──
  const FILTERS = ["All", "Drinks", "Energy", "Snacks", "Sweets", "Protein"];
  const SORTS = [
    { id: "price-asc",  label: "Price ↑",   full: "Price low to high" },
    { id: "price-desc", label: "Price ↓",   full: "Price high to low" },
    { id: "relevance",  label: "Relevance", full: "Relevance: best deals first" },
  ];

  const $viewSearch = document.getElementById("view-search");
  const $viewBrowse = document.getElementById("view-browse");
  const $filters = document.getElementById("filters");
  const $sorts = document.getElementById("sorts");
  const $browseList = document.getElementById("browse-list");
  const $browseCount = document.getElementById("browse-count");

  // Small per-device memory of the last tab, filter and sort.
  const store = {
    get(k, fallback) { try { return localStorage.getItem("pace." + k) ?? fallback; } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem("pace." + k, v); } catch { /* storage unavailable */ } },
  };
  let filter = store.get("filter", "All");
  let sort = store.get("sort", "price-asc");
  if (!FILTERS.includes(filter)) filter = "All";
  if (!SORTS.some((s) => s.id === sort)) sort = "price-asc";

  // Per-item facts the Browse rows need: the cheapest price, and how big the deal is.
  const itemFacts = new Map(catalog.map((it) => {
    const a = analyze(it);
    return [it, { a, gap: a.hasCompare ? a.max - a.min : 0, places: new Set(a.known.map((e) => e.loc)).size }];
  }));

  const byNameNumeric = (a, b) => a.item.localeCompare(b.item, undefined, { numeric: true });

  function browseRows() {
    const rows = [];
    for (const it of catalog) {
      if (filter !== "All" && it.category !== filter) continue;
      for (const e of it.entries) rows.push({ ...e, it });
    }
    const unpricedLast = (a, b) => (a.price == null) - (b.price == null);

    if (sort === "price-asc") rows.sort((a, b) => unpricedLast(a, b) || a.price - b.price || byNameNumeric(a, b));
    else if (sort === "price-desc") rows.sort((a, b) => unpricedLast(a, b) || b.price - a.price || byNameNumeric(a, b));
    else {
      // Relevance: biggest savings first, then items sold in the most places.
      // Each item's spots stay together, cheapest first.
      rows.sort((a, b) => {
        const fa = itemFacts.get(a.it), fb = itemFacts.get(b.it);
        return fb.gap - fa.gap || fb.places - fa.places || byNameNumeric(a, b)
          || unpricedLast(a, b) || (a.price ?? 0) - (b.price ?? 0);
      });
    }
    return rows;
  }

  function browseRow(r) {
    const { a } = itemFacts.get(r.it);
    const isBest = a.hasCompare && r.loc && r.price === a.min;
    const unpriced = r.price == null;
    const where = [locName(r.loc), r.size].filter(Boolean).join(" · ");
    return `
      <button type="button" class="card row${unpriced ? " unpriced" : ""}" data-item="${esc(r.item)}">
        <span class="card-main">
          <p class="place">${esc(r.item)}</p>
          <p class="where">${esc(where)}</p>
          ${isBest ? `<span class="tag">Best price</span>` : ""}
        </span>
        <span class="price">${unpriced ? "No price yet" : "$" + r.price.toFixed(2)}</span>
      </button>`;
  }

  function renderBrowse() {
    $filters.innerHTML = FILTERS.map((f) =>
      `<button type="button" class="chip" data-filter="${f}" aria-pressed="${f === filter}">${f}</button>`).join("");
    $sorts.innerHTML = SORTS.map((s) =>
      `<button type="button" class="sort" data-sort="${s.id}" aria-pressed="${s.id === sort}" aria-label="${s.full}" title="${s.full}">${s.label}</button>`).join("");
    const rows = browseRows();
    const nItems = new Set(rows.map((r) => r.item)).size;
    $browseCount.textContent = `${nItems} items · ${rows.length} prices`;
    $browseList.innerHTML = rows.map(browseRow).join("");
  }

  $filters.addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    filter = b.dataset.filter;
    store.set("filter", filter);
    renderBrowse();
    $viewBrowse.scrollTop = 0;
  });
  $sorts.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    sort = b.dataset.sort;
    store.set("sort", sort);
    renderBrowse();
  });
  $browseList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-item]");
    const it = b && byName.get(b.dataset.item);
    if (it) openItem(it);
  });

  // ── Tabs ──
  const views = { search: $viewSearch, browse: $viewBrowse };
  function showView(name) {
    for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.view === name)));
    store.set("view", name);
  }
  document.querySelector(".tabbar").addEventListener("click", (e) => {
    const t = e.target.closest("[data-view]");
    if (t) showView(t.dataset.view);
  });

  update();
  renderBrowse();
  showView(store.get("view", "search") === "browse" ? "browse" : "search");
})();
