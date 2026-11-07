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
    caffeine: info.caffeine || null,
    protein: info.protein || null,
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

  // ── Caffeine ──
  // "200mg" or "75–110mg" (a range when the flavor isn't known); "~" marks an estimate.
  const cafAmount = (c) => `${c.estimate ? "~" : ""}${c.mg}${c.max ? `–${c.max}` : ""}mg`;
  const cafKind = (c) => (c.estimate ? "estimate" : "typical");
  // Protein: typical grams from the package label.
  const proTag = (p) => (p ? `<span class="tag pro">${p.g}g protein · typical</span>` : "");
  // Caffeine and protein tags for a card ("" if the item has neither).
  const nutritionTags = (it) => cafTag(it.caffeine) + proTag(it.protein);

  const cafTag = (c, short = false) =>
    (c ? `<span class="tag caf">${cafAmount(c)}${short ? "" : " caffeine"} · ${cafKind(c)}</span>` : "");

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
          ${isBest || r.it.caffeine || r.it.protein ? `<span class="tags">${isBest ? `<span class="tag">Best price</span>` : ""}${nutritionTags(r.it)}</span>` : ""}
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
    const c = it.caffeine;
    if (c) {
      html += `<p class="caf-line"><strong>${cafAmount(c)} caffeine</strong> · ${cafKind(c)}${c.size ? ` for ${esc(c.size)}` : ""}${
        c.note ? `<br><span class="meta">${esc(c.note)}</span>` : ""}</p>`;
    }
    if (it.protein) {
      html += `<p class="pro-line"><strong>${it.protein.g}g protein</strong> · typical per item</p>`;
    }

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
            ${it.caffeine || it.protein ? `<span class="tags">${nutritionTags(it)}</span>` : ""}
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

  // ── Caffeine ──
  // Drinks and snacks ranked by cost per 100mg of caffeine at their cheapest spot.
  // For a range (e.g. Frappuccino 75–110mg) the ranking uses the low end, so an
  // item never looks like a better deal than it might be.
  const per100 = (price, mg) => (price / mg) * 100;
  const caffeineList = catalog
    .filter((it) => it.caffeine)
    .map((it) => {
      const { a } = itemFacts.get(it);
      const c = it.caffeine;
      return a.priced.length
        ? { it, a, c, cost: per100(a.min, c.mg), best: c.max ? per100(a.min, c.max) : null }
        : { it, a, c, cost: null };
    })
    .sort((x, y) => (x.cost == null) - (y.cost == null) || x.cost - y.cost || x.it.name.localeCompare(y.it.name));

  function caffeineCard(r, rank) {
    const { it, a, c } = r;
    const priced = r.cost != null;
    const costText = !priced ? "No price yet"
      : r.best ? `$${r.best.toFixed(2)}–${r.cost.toFixed(2)}` : `$${r.cost.toFixed(2)}`;
    return `
      <button type="button" class="card row caf-card${priced ? "" : " unpriced"}" data-item="${esc(it.name)}">
        ${priced ? `<span class="rank">${rank}</span>` : ""}
        ${thumb(it)}
        <span class="card-main">
          <p class="place">${esc(it.name)}</p>
          <p class="where">${priced ? `${esc(spotList(a.priced, a.min))} · $${a.min.toFixed(2)}` : "Price not confirmed yet"}</p>
          <span class="tags">${cafTag(c, true)}${c.size ? `<span class="tag size">${esc(c.size)}</span>` : ""}</span>
        </span>
        <span class="price-col">
          <span class="price">${costText}</span>
          ${priced ? `<span class="per">per 100mg</span>` : ""}
        </span>
      </button>`;
  }

  function renderCaffeine() {
    const priced = caffeineList.filter((r) => r.cost != null), unpriced = caffeineList.filter((r) => r.cost == null);
    $("caffeine-count").textContent = `${priced.length} drinks and snacks, cheapest caffeine first`;
    $("caffeine-list").innerHTML = priced.map((r, i) => caffeineCard(r, i + 1)).join("")
      + (unpriced.length ? `<p class="section-label">No price yet (${unpriced.length})</p>` + unpriced.map((r) => caffeineCard(r)).join("") : "");
  }
  $("caffeine-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-item]");
    if (b) location.hash = "#/caffeine/item/" + encodeURIComponent(b.dataset.item);
  });

  // ── Protein ──
  // Every item with a protein amount, at its cheapest spot.
  const MAX_EACH = 2; // the goal combo uses at most this many of the same item
  const PROTEIN_SORTS = [
    { id: "price", label: "Price low to high" },
    { id: "most",  label: "Most protein" },
    { id: "value", label: "Best value" },
  ];
  let proteinSort = store.get("proteinSort", "price");
  if (!PROTEIN_SORTS.some((s) => s.id === proteinSort)) proteinSort = "price";

  const per20 = (price, g) => (price / g) * 20;
  const proteinItems = catalog
    .filter((it) => it.protein && itemFacts.get(it).a.priced.length)
    .map((it) => {
      const { a } = itemFacts.get(it);
      return { it, a, g: it.protein.g, price: a.min, value: per20(a.min, it.protein.g) };
    });
  const byItem = (x, y) => x.it.name.localeCompare(y.it.name);

  function sortedProtein() {
    const list = [...proteinItems];
    if (proteinSort === "most") list.sort((x, y) => y.g - x.g || x.price - y.price || byItem(x, y));
    else if (proteinSort === "value") list.sort((x, y) => x.value - y.value || byItem(x, y));
    else list.sort((x, y) => x.price - y.price || byItem(x, y));
    return list;
  }

  function proteinCard(r, first) {
    return `
      <button type="button" class="card row pro-card${first ? " best" : ""}" data-item="${esc(r.it.name)}">
        ${thumb(r.it)}
        <span class="card-main">
          <p class="place">${esc(r.it.name)}</p>
          <p class="where pro-spot">${esc(spotList(r.a.priced, r.price))}</p>
          <span class="tags">${proTag(r.it.protein)}</span>
        </span>
        <span class="price-col">
          <span class="price">$${r.price.toFixed(2)}</span>
          <span class="per">$${r.value.toFixed(2)} per 20g</span>
        </span>
      </button>`;
  }

  // Cheapest combo reaching at least `goal` grams, using up to MAX_EACH of each
  // item. Small 0/1 knapsack over grams (capped at the goal).
  function cheapestCombo(goal) {
    const units = proteinItems.flatMap((r) => Array.from({ length: MAX_EACH }, () => r));
    const best = new Array(goal + 1).fill(null); // best[g] = { cost, picks: [index…] }
    best[0] = { cost: 0, picks: [] };
    units.forEach((u, i) => {
      for (let g = goal; g >= 0; g--) {
        if (!best[g]) continue;
        const ng = Math.min(goal, g + u.g);
        const cost = best[g].cost + u.price;
        const cur = best[ng];
        if (!cur || cost < cur.cost - 1e-9 || (Math.abs(cost - cur.cost) < 1e-9 && best[g].picks.length + 1 < cur.picks.length)) {
          best[ng] = { cost, picks: [...best[g].picks, i] };
        }
      }
    });
    const hit = best[goal];
    if (!hit) return null;
    const counts = new Map();
    for (const i of hit.picks) counts.set(units[i], (counts.get(units[i]) || 0) + 1);
    const lines = [...counts].map(([r, n]) => ({ r, n })).sort((x, y) => y.n * y.r.g - x.n * x.r.g);
    return { cost: hit.cost, grams: lines.reduce((s, l) => s + l.n * l.r.g, 0), lines };
  }

  function renderProteinGoal() {
    const raw = parseInt($("protein-goal").value, 10);
    const $out = $("protein-combo");
    if (!Number.isFinite(raw) || raw < 1) { $out.innerHTML = `<p class="goal-note">Enter how many grams you want.</p>`; return; }
    const goal = Math.min(raw, 400);
    const maxG = proteinItems.reduce((s, r) => s + r.g * MAX_EACH, 0);
    const combo = goal <= maxG ? cheapestCombo(goal) : null;
    if (!combo) {
      $out.innerHTML = `<p class="goal-note">That’s more than ${MAX_EACH} of every protein item adds up to (${maxG}g).</p>`;
      return;
    }
    $out.innerHTML = `
      <p class="goal-total">${combo.grams}g for ${dollars(combo.cost)}</p>
      <ul class="goal-list">
        ${combo.lines.map(({ r, n }) => `<li>
          <span>${n > 1 ? `${n} × ` : ""}${esc(r.it.name)} <span class="goal-g">${r.g * n}g</span></span>
          <span class="goal-where">${esc(spotList(r.a.priced, r.price))} · ${dollars(r.price * n)}</span>
        </li>`).join("")}
      </ul>`;
  }

  function renderProtein() {
    $("protein-sorts").innerHTML = PROTEIN_SORTS.map((s) =>
      `<button type="button" class="sort" data-sort="${s.id}" aria-pressed="${s.id === proteinSort}">${s.label}</button>`).join("");
    keepInView($("protein-sorts").parentElement);
    $("protein-count").textContent = proteinSort === "value"
      ? `${proteinItems.length} protein snacks, cheapest per 20g first`
      : `${proteinItems.length} protein snacks at their cheapest spot`;
    $("protein-list").innerHTML = sortedProtein().map((r, i) => proteinCard(r, i === 0)).join("");
  }

  $("protein-sorts").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    proteinSort = b.dataset.sort;
    store.set("proteinSort", proteinSort);
    renderProtein();
  });
  $("protein-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-item]");
    if (b) location.hash = "#/protein/item/" + encodeURIComponent(b.dataset.item);
  });
  $("protein-goal").value = store.get("proteinGoal", "40");
  $("protein-goal").addEventListener("input", (e) => { store.set("proteinGoal", e.target.value); renderProteinGoal(); });

  // ── My Pace ──
  // Daily budget = balance ÷ days left on campus (today through the last day,
  // minus days away; weekdays only for Monday–Friday plans).
  // Weekly budget = daily × those days in the next 7.
  // With a meal plan picked, Duke's expected balance starts at the plan total on
  // the first day of the semester and drops a little every day, reaching $0 on
  // the last day.
  // Everything is saved in this browser only (localStorage), never sent anywhere.
  const PACE_KEY = "pace.myPace";
  const MEAL = window.PACE_MEAL_PLANS || { plans: [] };
  const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const dollars = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

  const semesterStart = MEAL.start ? parseISO(MEAL.start) : null;
  const semesterEnd = MEAL.end ? parseISO(MEAL.end) : null;
  const DEFAULT_LAST_DAY = MEAL.end || "";

  let pace = { plan: "", balance: "", lastDay: DEFAULT_LAST_DAY, away: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(PACE_KEY) || "null");
    if (saved && typeof saved === "object") {
      pace = {
        plan: MEAL.plans.some((p) => p.id === saved.plan) ? saved.plan : "",
        balance: String(saved.balance ?? ""),
        lastDay: isISO(String(saved.lastDay ?? "")) ? saved.lastDay : DEFAULT_LAST_DAY,
        away: Array.isArray(saved.away) ? saved.away.filter(isISO) : [],
      };
    }
  } catch { /* storage unavailable: start empty */ }
  const savePace = () => { try { localStorage.setItem(PACE_KEY, JSON.stringify(pace)); } catch { /* ignore */ } };

  const parseBalance = (s) => {
    const n = parseFloat(String(s).replace(/[$,\s]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const currentPlan = () => MEAL.plans.find((p) => p.id === pace.plan) || null;

  // Where Duke's chart says the balance should be on date `d`. It drops by the
  // same amount every day, from the plan total on the first day to $0 on the
  // last day (about the weekly amount ÷ 7 per day).
  function expectedBalance(plan, d) {
    if (!semesterStart || !semesterEnd) return null;
    if (d <= semesterStart) return plan.total;
    if (d >= semesterEnd) return 0;
    const share = daysBetween(semesterStart, d) / daysBetween(semesterStart, semesterEnd);
    return plan.total * (1 - share);
  }

  // Days from `from` through `to` (inclusive) that count toward the budget.
  function campusDays(from, to, awaySet, weekdaysOnly) {
    let n = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (weekdaysOnly && isWeekend(d)) continue;
      if (!awaySet.has(iso(d))) n++;
    }
    return n;
  }

  function computePace() {
    const t = today();
    const plan = currentPlan();
    const weekdaysOnly = !!(plan && plan.weekdaysOnly);
    const balance = parseBalance(pace.balance);
    const last = isISO(pace.lastDay) ? parseISO(pace.lastDay) : null;
    const away = new Set(pace.away);
    const expected = plan ? expectedBalance(plan, t) : null;
    const base = { t, plan, weekdaysOnly, balance, last, expected };
    if (balance == null || !last) return { ...base, ready: false };
    if (last < t) return { ...base, ready: false, past: true };
    const left = campusDays(t, last, away, weekdaysOnly);
    const allDays = campusDays(t, last, new Set(), weekdaysOnly);
    const daily = left ? balance / left : null;
    // Today doesn't count if it's an away day, or a weekend on a Monday–Friday plan.
    const counts = (d) => !away.has(iso(d)) && !(weekdaysOnly && isWeekend(d));
    let nextDay = null;
    for (let d = addDays(t, 1); d <= last; d = addDays(d, 1)) if (counts(d)) { nextDay = d; break; }
    // Catch up in 2 weeks: the per-day spend that brings the balance back to
    // Duke's expected track 14 days from now. Only when 14+ days are left.
    let catchUp = null;
    const horizon = addDays(t, 14);
    if (plan && horizon <= last) {
      const n14 = campusDays(t, addDays(t, 13), away, weekdaysOnly);
      if (n14) catchUp = (balance - expectedBalance(plan, horizon)) / n14;
    }
    return {
      ...base, ready: true, left, awayInRange: allDays - left,
      daily, nextDay, catchUp,
      dailyNoAway: allDays ? balance / allDays : null,
      notCountedToday: !counts(t),
      diff: expected != null ? balance - expected : null,
    };
  }

  function renderCalendar(p) {
    const t = today();
    const end = p.last && p.last >= t ? p.last : addDays(t, 60);
    const away = new Set(pace.away);
    let html = "";
    for (let m = new Date(t.getFullYear(), t.getMonth(), 1); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      html += `<div class="month"><p class="month-name">${MONTH_NAMES[m.getMonth()]}</p><div class="cal">`;
      html += WEEKDAYS.map((w) => `<span class="dow" aria-hidden="true">${w}</span>`).join("");
      for (let i = 0; i < m.getDay(); i++) html += `<span></span>`;
      for (let d = m; d.getMonth() === m.getMonth(); d = addDays(d, 1)) {
        const key = iso(d);
        const off = d < t || d > end;
        const notCounted = p.weekdaysOnly && isWeekend(d); // weekends don't count on Mon–Fri plans
        const on = away.has(key);
        const label = `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
        html += off || notCounted
          ? `<span class="day ${off ? "off" : "weekend"}" aria-hidden="true">${d.getDate()}</span>`
          : `<button type="button" class="day${on ? " away-on" : ""}${key === iso(t) ? " today" : ""}" data-day="${key}" aria-pressed="${on}" aria-label="${label}${on ? ", away" : ""}">${d.getDate()}</button>`;
      }
      html += `</div></div>`;
    }
    $("pace-cal").innerHTML = html;
  }

  function renderPace() {
    const p = computePace();
    const dayWord = p.weekdaysOnly ? "weekday" : "day";
    const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
    $("pace-date").textContent = `${DAY_NAMES[p.t.getDay()]}, ${MONTH_NAMES[p.t.getMonth()].slice(0, 3)} ${p.t.getDate()}`;
    $("pace-source").textContent = p.plan ? MEAL.source : "";
    $("pace-source").hidden = !p.plan;
    const $pill = $("pace-pill"), $hint = $("pace-hint");

    // Expected balance and ahead / behind (needs a plan and a balance).
    const showExpected = p.plan && p.expected != null;
    $("pace-expected").hidden = !showExpected;
    if (showExpected) {
      $("pace-exp-amt").textContent = dollars(p.expected);
      const $s = $("pace-status");
      if (p.balance == null) {
        $s.textContent = "Enter your balance to see if you’re ahead or behind.";
        $s.className = "pace-status";
      } else {
        const d = Math.round(p.balance - p.expected);
        $s.textContent = d > 0 ? `You’re $${d.toLocaleString("en-US")} ahead`
          : d < 0 ? `You’re $${(-d).toLocaleString("en-US")} behind` : "You’re right on pace";
        $s.className = "pace-status " + (d > 0 ? "ahead" : d < 0 ? "behind" : "on");
      }
      // One line when behind, if catching up in 2 weeks is possible.
      const $c = $("pace-catchup");
      const behind = p.balance != null && Math.round(p.balance - p.expected) < 0;
      $c.hidden = !(behind && p.ready && p.catchUp > 0);
      if (!$c.hidden) $c.innerHTML = `To catch up in 2 weeks, spend <strong>${dollars(p.catchUp)} a ${dayWord}</strong>.`;
    }

    $("pace-daily").classList.toggle("is-empty", !p.ready || p.daily == null);
    $("pace-sub").textContent = "You can spend today";
    if (!p.ready || p.daily == null) {
      $("pace-daily").textContent = "$0.00";
      $pill.hidden = true;
      $("pace-new").hidden = true;
      $hint.hidden = false;
      $hint.textContent = p.past ? "That last day has already passed. Pick a new one below."
        : p.ready ? `You’ve marked every ${dayWord} left as away. Unmark one to see a budget.`
        : "Enter your food points balance below to see your budget.";
    } else {
      $("pace-daily").textContent = dollars(p.daily);
      // On a day that doesn't count, the number is for the next day that does.
      if (p.notCountedToday) {
        const tomorrow = p.nextDay && daysBetween(p.t, p.nextDay) === 1;
        $("pace-sub").textContent = !p.nextDay ? "Your daily budget"
          : tomorrow ? "Tomorrow’s budget" : `${DAY_NAMES[p.nextDay.getDay()]}’s budget`;
      }
      $hint.hidden = !p.notCountedToday;
      $hint.textContent = !p.notCountedToday ? ""
        : p.weekdaysOnly && isWeekend(p.t) ? "Your plan covers Monday–Friday, so nothing is set aside for today."
        : "You marked today as away, so nothing is set aside for it.";
      $pill.hidden = false;
      $pill.textContent = `${plural(p.left, dayWord)} on campus left`;
      $("pace-new").hidden = !p.awayInRange;
      if (p.awayInRange) {
        $("pace-new-amount").textContent = dollars(p.daily);
        $("pace-new-sub").textContent = `Up from ${dollars(p.dailyNoAway)} a ${dayWord}`;
      }
    }

    const $away = $("pace-away");
    const counts = (k) => !(p.weekdaysOnly && isWeekend(parseISO(k)));
    const n = pace.away.filter((k) => k >= iso(p.t) && (!p.last || k <= iso(p.last)) && counts(k)).length;
    $away.hidden = !n;
    $away.textContent = `${plural(n, dayWord)} away`;
    renderCalendar(p);
  }

  // Inputs: fill from saved values, save on every change.
  $("pace-plan").insertAdjacentHTML("beforeend",
    MEAL.plans.map((pl) => `<option value="${pl.id}">${esc(pl.name)} · ${dollars(pl.total)}</option>`).join(""));
  $("pace-plan").value = pace.plan;
  $("pace-balance").value = pace.balance;
  $("pace-last").value = pace.lastDay;
  $("pace-last").min = iso(today());
  $("pace-plan").addEventListener("change", (e) => { pace.plan = e.target.value; savePace(); renderPace(); });
  $("pace-balance").addEventListener("input", (e) => { pace.balance = e.target.value; savePace(); renderPace(); });
  $("pace-balance").addEventListener("blur", (e) => {
    const n = parseBalance(e.target.value);
    if (n != null) { e.target.value = n.toFixed(2); pace.balance = e.target.value; savePace(); }
  });
  $("pace-last").addEventListener("change", (e) => { pace.lastDay = e.target.value; savePace(); renderPace(); });
  $("pace-cal").addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]");
    if (!b) return;
    const k = b.dataset.day;
    pace.away = pace.away.includes(k) ? pace.away.filter((x) => x !== k) : [...pace.away, k].sort();
    savePace();
    renderPace();
  });

  // ── Screens & routing ──
  // Each screen has its own address so the phone's back button works:
  //   #/browse  #/item/<name>  #/deals  #/deals/item/<name>
  //   #/caffeine  #/caffeine/item/<name>  #/protein  #/me
  // An item opened from Deals lives under #/deals/… so the Deals tab stays lit (same for Caffeine).
  const TAB_NAMES = { browse: "Browse", deals: "Deals", caffeine: "Caffeine", protein: "Protein" };
  const views = [...document.querySelectorAll(".view")];
  const scrollMemory = {};   // list screen -> scroll position
  let current = null;        // "browse", "deals", "item", …
  let currentTab = null;
  let prevList = null;       // list screen the open item was reached from

  function go(hash) { location.hash = hash; }

  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    let view = "browse", tab = "browse";
    const m = h.match(/^(?:(deals|caffeine|protein)\/)?item\/(.+)$/);
    if (m) {
      const it = byName.get(decodeURIComponent(m[2]));
      if (it) {
        renderItem(it);
        view = "item";
        tab = m[1] || "browse";
      }
    } else if (["deals", "caffeine", "protein", "me"].includes(h)) view = tab = h;
    if (view === "me") renderPace(); // keeps "today" right if the app was left open overnight

    if (current && current !== "item") scrollMemory[current] = window.scrollY;
    if (view === "item") { if (current !== "item") prevList = current; }
    else prevList = null;

    views.forEach((v) => (v.hidden = v.id !== "view-" + view));
    document.querySelectorAll(".tab").forEach((t) =>
      t.dataset.tab === tab ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current"));
    $("back-label").textContent = TAB_NAMES[tab] || "Browse";
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
  renderCaffeine();
  renderProtein();
  renderProteinGoal();
  renderPace();
  route();
})();
