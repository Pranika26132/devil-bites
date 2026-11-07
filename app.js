(function () {
  "use strict";

  const { locations, items, prices } = window.PACE_DATA;
  const WEEKS_PER_SEMESTER = 15;

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

  // ── Search scoring (0 = no match) ──
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

  // ── Formatting ──
  const money = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const shortDate = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${MONTHS[m - 1]} ${d}`; };
  const locName = (id) => (id ? locations[id].name : "Location not recorded");
  const joinNames = (arr) => arr.length <= 2 ? arr.join(" or ") : `${arr.slice(0, -1).join(", ")} or ${arr.at(-1)}`;

  // ── Photos ──
  // Only approved photos ("ok") are shown; see data/photos.js and photo-report.md.
  const PHOTOS = window.PACE_PHOTOS || {};
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const CATEGORY_ICONS = {
    Drinks:  svg('<path d="M10 2.5h4M10.5 2.5v3L8 9v11a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 20V9l-2.5-3.5v-3"/><path d="M8 13h8"/>'),
    Energy:  svg('<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6l1-8z"/>'),
    Snacks:  svg('<path d="M6 3.5h12l-1.2 3L18 9.5V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V9.5l1.2-3z"/><path d="M7.2 6.5h9.6"/>'),
    Sweets:  svg('<circle cx="12" cy="12" r="4"/><path d="M8.5 10L3.5 7.5v9l5-2.5M15.5 10l5-2.5v9l-5-2.5"/>'),
    Protein: svg('<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
    Meals:   svg('<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 7.5c0-1.5 1.5-1.5 1.5-3M13.5 7.5c0-1.5 1.5-1.5 1.5-3"/>'),
  };
  function thumb(it, big = false) {
    const p = PHOTOS[it.name];
    const cls = `thumb${big ? " big" : ""}`;
    if (p && p.status === "ok") return `<img class="${cls}" src="${esc(p.file)}" alt="" loading="lazy" decoding="async">`;
    return `<span class="${cls} icon">${CATEGORY_ICONS[it.category] || CATEGORY_ICONS.Snacks}</span>`;
  }

  // Splits an item's entries into the groups the comparison screen shows.
  function analyze(it) {
    const known = it.entries.filter((e) => e.loc);
    const priced = known.filter((e) => e.price != null).sort((a, b) => a.price - b.price);
    const unpriced = known.filter((e) => e.price == null);
    const noLoc = it.entries.filter((e) => !e.loc).sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    const min = priced.length ? priced[0].price : null;
    const max = priced.length ? priced.at(-1).price : null;
    return { known, priced, unpriced, noLoc, min, max, hasCompare: priced.length > 1 && max > min };
  }

  // Per-item facts Browse needs: the cheapest price, and how big the deal is.
  const itemFacts = new Map(catalog.map((it) => {
    const a = analyze(it);
    return [it, { a, gap: a.hasCompare ? a.max - a.min : 0, places: new Set(a.known.map((e) => e.loc)).size }];
  }));

  // ── Elements ──
  const $ = (id) => document.getElementById(id);
  const $q = $("q"), $clear = $("clear");
  const $filters = $("filters"), $sorts = $("sorts"), $notice = $("browse-notice");
  const $browseList = $("browse-list"), $browseCount = $("browse-count");
  const $itemDetail = $("item-detail");

  // Small per-device memory of the last filter and sort (never the location).
  const store = {
    get(k, fallback) { try { return localStorage.getItem("pace." + k) ?? fallback; } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem("pace." + k, v); } catch { /* storage unavailable */ } },
  };

  // ── Location ──
  // The position lives only in this variable, for this page visit. It is never
  // saved (no localStorage, no cookies) and never sent anywhere; distances are
  // worked out right here on the device.
  const METERS_PER_MIN = 80;
  const DOLLARS_PER_WALK_MIN = 0.15; // Best nearby: a 10-minute walk "costs" the same as $1.50
  const OFF_CAMPUS_MINS = 30;
  let here = null;           // { lat, lng } once the user allows location
  let locating = false;
  let notice = null;         // { kind: "info" | "warn", text }

  function metersBetween(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function walkMins(locId) {
    const loc = locId && locations[locId];
    if (!here || !loc || loc.lat == null) return null;
    return Math.max(1, Math.round(metersBetween(here, loc) / METERS_PER_MIN));
  }
  function walkLabel(mins) {
    if (mins < 60) return `${mins} min walk`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h} hr${m ? ` ${m} min` : ""} walk`;
  }

  function requestLocation(wantedSort) {
    const fallBack = (text) => {
      locating = false;
      sort = "price-asc";
      notice = { kind: "warn", text };
      renderBrowse();
    };
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      return fallBack("This browser can’t share your location here, so you’re seeing the lowest prices first instead.");
    }
    locating = true;
    notice = { kind: "info", text: "Finding where you are…" };
    renderBrowse();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating = false;
        here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        sort = wantedSort;
        const nearest = Math.min(...Object.keys(locations).map(walkMins).filter((m) => m != null));
        notice = nearest > OFF_CAMPUS_MINS
          ? { kind: "info", text: "Looks like you’re off campus, so the walks are long. Times are from where you are right now." }
          : null;
        renderBrowse();
      },
      (err) => {
        fallBack(err.code === err.PERMISSION_DENIED
          ? "No problem! Without your location, Pace sorts by lowest price instead. You can turn location on for this site in your browser settings anytime."
          : "Couldn’t find your location just now, so you’re seeing the lowest prices first. Try again in a moment.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  // ── Browse ──
  const FILTERS = ["All", "Drinks", "Energy", "Snacks", "Sweets", "Protein"];
  const SORTS = [
    { id: "price-asc",  label: "Price ↑",     full: "Price low to high" },
    { id: "price-desc", label: "Price ↓",     full: "Price high to low" },
    { id: "relevance",  label: "Relevance",   full: "Relevance: best matches and deals first" },
    { id: "closest",    label: "Closest",     full: "Closest to me", needsLocation: true },
    { id: "nearby",     label: "Best nearby", full: "Best nearby: balances price and walking time", needsLocation: true },
  ];
  const needsLocation = (id) => SORTS.some((s) => s.id === id && s.needsLocation);

  let filter = store.get("filter", "All");
  let sort = store.get("sort", "price-asc");
  if (!FILTERS.includes(filter)) filter = "All";
  // Location sorts aren't restored on reload, so the app never asks for location on its own.
  if (!SORTS.some((s) => s.id === sort) || needsLocation(sort)) sort = "price-asc";

  const byNameNumeric = (a, b) => a.item.localeCompare(b.item, undefined, { numeric: true });

  function browseRows() {
    const q = norm($q.value);
    const rows = [];
    for (const it of catalog) {
      if (filter !== "All" && it.category !== filter) continue;
      const s = q ? score(it, q) : 0;
      if (q && !s) continue;
      for (const e of it.entries) rows.push({ ...e, it, match: s, mins: walkMins(e.loc) });
    }
    const unpricedLast = (a, b) => (a.price == null) - (b.price == null);
    const noDistanceLast = (a, b) => (a.mins == null) - (b.mins == null);

    if (sort === "closest") {
      rows.sort((a, b) => noDistanceLast(a, b) || a.mins - b.mins || unpricedLast(a, b) || a.price - b.price || byNameNumeric(a, b));
    } else if (sort === "nearby") {
      // Price plus a small charge per minute of walking, lowest first.
      const cost = (r) => r.price + DOLLARS_PER_WALK_MIN * r.mins;
      const unscorable = (r) => r.mins == null || r.price == null;
      rows.sort((a, b) => unscorable(a) - unscorable(b) || noDistanceLast(a, b) || unpricedLast(a, b)
        || (cost(a) - cost(b)) || (a.price ?? 0) - (b.price ?? 0) || byNameNumeric(a, b));
    } else if (sort === "price-asc") {
      rows.sort((a, b) => unpricedLast(a, b) || a.price - b.price || byNameNumeric(a, b));
    } else if (sort === "price-desc") {
      rows.sort((a, b) => unpricedLast(a, b) || b.price - a.price || byNameNumeric(a, b));
    } else {
      // Relevance: best search match first, then biggest savings, then items sold
      // in the most places. Each item's spots stay together, cheapest first.
      rows.sort((a, b) => {
        const fa = itemFacts.get(a.it), fb = itemFacts.get(b.it);
        return b.match - a.match || fb.gap - fa.gap || fb.places - fa.places || byNameNumeric(a, b)
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
        ${thumb(r.it)}
        <span class="card-main">
          <p class="place">${esc(r.item)}</p>
          <p class="where">${esc(where)}</p>
          ${isBest ? `<span class="tag">Best price</span>` : ""}
        </span>
        <span class="price-col">
          <span class="price">${unpriced ? "No price yet" : "$" + r.price.toFixed(2)}</span>
          ${r.mins != null ? `<span class="walk">${walkLabel(r.mins)}</span>` : ""}
        </span>
      </button>`;
  }

  function renderBrowse() {
    $filters.innerHTML = FILTERS.map((f) =>
      `<button type="button" class="chip" data-filter="${f}" aria-pressed="${f === filter}">${f}</button>`).join("");
    $sorts.innerHTML = SORTS.map((s) =>
      `<button type="button" class="sort" data-sort="${s.id}" aria-pressed="${s.id === sort}" aria-label="${s.full}" title="${s.full}"${locating ? " disabled" : ""}>${s.label}</button>`).join("");

    keepInView($filters);
    keepInView($sorts.parentElement);

    $notice.hidden = !notice;
    if (notice) { $notice.textContent = notice.text; $notice.dataset.kind = notice.kind; }

    const raw = $q.value.trim();
    $clear.hidden = !raw;
    const rows = browseRows();
    const nItems = new Set(rows.map((r) => r.item)).size;

    if (!rows.length && raw) {
      // Nothing here, but maybe in another category?
      const elsewhere = filter !== "All" && catalog.some((it) => score(it, norm(raw)) > 0);
      $browseCount.textContent = "";
      $browseList.innerHTML = `
        <div class="empty"><strong>No prices for “${esc(raw)}”${filter !== "All" ? ` in ${filter}` : ""} yet.</strong><br>
        ${elsewhere ? `<button type="button" class="chip" data-filter="All">Search all categories</button>`
                    : "Try a brand name, like “Clif” or “Red Bull”."}</div>`;
      return;
    }
    $browseCount.textContent = raw
      ? `${nItems} ${nItems === 1 ? "item matches" : "items match"} “${raw}”`
      : `${nItems} items · ${rows.length} prices`;
    $browseList.innerHTML = rows.map(browseRow).join("");
  }

  // Keeps the selected pill visible in a sideways-scrolling row (phones only).
  function keepInView($row) {
    const $on = $row.querySelector('[aria-pressed="true"]');
    if (!$on || !$row.clientWidth || $row.scrollWidth <= $row.clientWidth) return;
    const rowLeft = $row.getBoundingClientRect().left;
    const left = $on.getBoundingClientRect().left - rowLeft + $row.scrollLeft, right = left + $on.offsetWidth;
    if (right > $row.scrollLeft + $row.clientWidth - 20) $row.scrollLeft = right - $row.clientWidth + 20;
    else if (left < $row.scrollLeft) $row.scrollLeft = Math.max(0, left - 60);
  }

  function setFilter(f) {
    filter = f;
    store.set("filter", filter);
    renderBrowse();
  }

  $q.addEventListener("input", renderBrowse);
  $q.addEventListener("keydown", (e) => { if (e.key === "Enter") $q.blur(); });
  $clear.addEventListener("click", () => { $q.value = ""; renderBrowse(); $q.focus(); });

  $filters.addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (b) setFilter(b.dataset.filter);
  });
  $sorts.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    const picked = b.dataset.sort;
    notice = null;
    if (needsLocation(picked)) {
      // Ask (or re-check) each time, so times stay right as the user moves.
      requestLocation(picked);
      return;
    }
    sort = picked;
    store.set("sort", sort);
    renderBrowse();
  });
  $browseList.addEventListener("click", (e) => {
    const f = e.target.closest("[data-filter]");
    if (f) return setFilter(f.dataset.filter);
    const b = e.target.closest("[data-item]");
    if (b && byName.has(b.dataset.item)) go("#/item/" + encodeURIComponent(b.dataset.item));
  });

  // ── Item price comparison ──
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
    const mins = walkMins(e.loc);
    return `
      <article class="card${isBest ? " best" : ""}${unpriced ? " unpriced" : ""}">
        <div class="card-main">
          <p class="place">${esc(locName(e.loc))}</p>
          ${isBest ? `<p class="best-label">Best price</p>` : ""}
          ${metaLine(e, unpriced ? "Price not confirmed yet" : "")}
        </div>
        <span class="price-col">
          <span class="price">${unpriced ? "—" : money(e.price)}</span>
          ${mins != null ? `<span class="walk">${walkLabel(mins)}</span>` : ""}
        </span>
      </article>`;
  }

  function renderItem(it) {
    const a = analyze(it);
    const isMeal = it.category === "Meals";
    const n = new Set(a.known.map((e) => e.loc)).size;
    const photo = PHOTOS[it.name];
    const credit = photo && photo.status === "ok" && photo.source
      ? `<p class="photo-credit"><a href="${esc(photo.source)}" target="_blank" rel="noopener">Photo: Open Food Facts</a></p>` : "";
    let html = `<div class="item-head">${thumb(it, true)}<div>
      <h1 class="item-name">${esc(it.name)}</h1>
      ${n ? `<p class="count">${n} ${n === 1 ? "place" : "places"} ${isMeal ? "serve" : "sell"} this</p>`
          : `<p class="count">Where it’s sold hasn’t been recorded yet</p>`}
      ${credit}</div></div>`;

    if (a.priced.length || a.unpriced.length) {
      html += `<div class="cards">`;
      html += a.priced.map((e) => priceCard(e, a.hasCompare && e.price === a.min)).join("");
      html += a.unpriced.map((e) => priceCard(e, false)).join("");
      html += `</div>`;
    }

    if (a.hasCompare) {
      const cheap = joinNames([...new Set(a.priced.filter((e) => e.price === a.min).map((e) => locName(e.loc)))]);
      const priceyNames = [...new Set(a.priced.filter((e) => e.price === a.max).map((e) => locName(e.loc)))];
      const pricey = priceyNames.length > 1 && priceyNames.every((x) => / vending$/.test(x)) ? "vending"
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
    $itemDetail.innerHTML = html;
    document.title = `${it.name} · Pace`;
  }

  // ── Deals ──
  // Items sold at 2+ places, biggest price gap first. Items that cost the same
  // everywhere go in their own section at the bottom.
  const spotList = (entries, price) => {
    const names = [...new Set(entries.filter((e) => e.price === price).map((e) => locName(e.loc)))];
    if (names.length > 1 && names.every((x) => / vending$/.test(x))) return `${names.length} vending machines`;
    return names.length > 2 ? `${names[0]} + ${names.length - 1} more` : names.join(" or ");
  };
  const deals = catalog
    .map((it) => ({ it, ...itemFacts.get(it) }))
    .filter((d) => new Set(d.a.priced.map((e) => e.loc)).size >= 2)
    .sort((x, y) => y.gap - x.gap || x.it.name.localeCompare(y.it.name, undefined, { numeric: true }));

  function dealCard(d) {
    const { it, a } = d;
    const save = d.gap > 0;
    return `
      <button type="button" class="card deal" data-item="${esc(it.name)}">
        <span class="deal-top">
          ${thumb(it)}
          <span class="card-main">
            <p class="place">${esc(it.name)}</p>
            <p class="where">${d.places} places sell this</p>
          </span>
          ${save ? `<span class="save">Save $${d.gap.toFixed(2)}</span>` : ""}
        </span>
        <span class="deal-rows">
          <span class="deal-row${save ? " cheap" : ""}">
            <span class="deal-label">${save ? "Cheapest" : "Price"}</span>
            <span class="deal-spot">${esc(save ? spotList(a.priced, a.min) : (d.places === 2 ? "Same at both spots" : `Same at all ${d.places} spots`))}</span>
            <span class="deal-price">$${a.min.toFixed(2)}</span>
          </span>
          ${save ? `<span class="deal-row">
            <span class="deal-label">Priciest</span>
            <span class="deal-spot">${esc(spotList(a.priced, a.max))}</span>
            <span class="deal-price">$${a.max.toFixed(2)}</span>
          </span>` : ""}
        </span>
      </button>`;
  }

  function renderDeals() {
    const gaps = deals.filter((d) => d.gap > 0), same = deals.filter((d) => d.gap === 0);
    $("deals-count").textContent = `${gaps.length} items cost less somewhere else`;
    $("deals-list").innerHTML = gaps.map(dealCard).join("")
      + (same.length ? `<p class="section-label">Same price everywhere (${same.length})</p>` + same.map(dealCard).join("") : "");
  }
  $("deals-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-item]");
    if (b) location.hash = "#/deals/item/" + encodeURIComponent(b.dataset.item);
  });

  // ── Screens & routing ──
  // Each screen has its own address so the phone's back button works:
  //   #/browse  #/item/<name>  #/deals  #/deals/item/<name>  #/protein  #/me
  // An item opened from Deals lives under #/deals/… so the Deals tab stays lit.
  const views = [...document.querySelectorAll(".view")];
  const scrollMemory = {};   // list screen -> scroll position
  let current = null;        // "browse", "deals", "item", …
  let currentTab = null;
  let prevList = null;       // list screen the open item was reached from

  function go(hash) { location.hash = hash; }

  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    let view = "browse", tab = "browse";
    const m = h.match(/^(deals\/)?item\/(.+)$/);
    if (m) {
      const it = byName.get(decodeURIComponent(m[2]));
      if (it) {
        renderItem(it);
        view = "item";
        tab = m[1] ? "deals" : "browse";
      }
    } else if (["deals", "protein", "me"].includes(h)) view = tab = h;

    if (current && current !== "item") scrollMemory[current] = window.scrollY;
    if (view === "item") { if (current !== "item") prevList = current; }
    else prevList = null;

    views.forEach((v) => (v.hidden = v.id !== "view-" + view));
    document.querySelectorAll(".tab").forEach((t) =>
      t.dataset.tab === tab ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current"));
    $("back-label").textContent = tab === "deals" ? "Deals" : "Browse";
    if (view !== "item") document.title = "Pace";

    // Coming back to a list returns to where the user was in it.
    window.scrollTo(0, view === "item" ? 0 : scrollMemory[view] || 0);
    current = view;
    currentTab = tab;
  }

  // Back from an item: step back in history if we came from its list, else open the list.
  function backToList() {
    if (prevList === currentTab) history.back();
    else location.hash = "#/" + currentTab;
  }
  $("back").addEventListener("click", backToList);

  // Tapping the active tab while on an item goes back to that tab's list.
  document.querySelector(".tabs").addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (t && current === "item" && t.dataset.tab === currentTab) { e.preventDefault(); backToList(); }
  });

  window.addEventListener("hashchange", route);
  renderBrowse();
  renderDeals();
  route();
})();
