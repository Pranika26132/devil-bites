(function () {
  "use strict";

  const { locations, items, prices } = window.PACE_DATA;
  const WEEKS_PER_SEMESTER = 15;
  // Where "Tell us." in the footer links to (a form or a mailto: link).
  // Leave empty to show it as plain text.
  const FEEDBACK_URL = "";
  if (FEEDBACK_URL) {
    const $t = document.getElementById("tell-us");
    $t.outerHTML = `<a href="${FEEDBACK_URL}" target="_blank" rel="noopener">Tell us.</a>`;
  }

  // A price entry's flavors as a list (data stores a list; older data a string).
  const flavorList = (e) => (Array.isArray(e.flavors) ? e.flavors : e.flavors ? String(e.flavors).split(", ") : []);

  // ── Build one record per item, with all its price entries ──
  const catalog = Object.entries(items).map(([name, info]) => ({
    name,
    category: info.category,
    caffeine: info.caffeine || null,
    protein: info.protein || null,
    energy: !!info.energy,
    highProtein: !!info.highProtein,
    healthy: !!info.healthy,
    aka: info.aka || [],
    entries: [],
    flavors: "",
  }));
  const byName = new Map(catalog.map((it) => [it.name, it]));

  // Sales tax: each spot's rate lives in data/prices.js (locations → tax).
  // From here on `price` is the after-tax price, so every comparison, cheapest
  // spot, saving and ranking uses it. `shelf` keeps the sticker price for display.
  const taxRate = (loc) => (loc && locations[loc] && locations[loc].tax) || 0;
  const withTax = (price, rate) => Math.round(price * (1 + rate) * 100) / 100;

  for (const p of prices) {
    const it = byName.get(p.item);
    if (!it) { console.warn("Devil Bites: price for unknown item", p.item); continue; }
    if (p.loc && !locations[p.loc]) console.warn("Devil Bites: unknown location", p.loc);
    const tax = taxRate(p.loc);
    it.entries.push({ ...p, shelf: p.price, tax, price: p.price == null ? null : withTax(p.price, tax) });
    if (p.flavors) it.flavors += " " + flavorList(p).join(", ");
  }

  // "$1.99 + 2% tax" under an after-tax price ("" when there's no tax).
  const shelfNote = (e) => (e.tax && e.shelf != null
    ? `<span class="shelf">$${e.shelf.toFixed(2)} + ${+(e.tax * 100).toFixed(2)}% tax</span>` : "");

  // ── Search ──
  // Names, brands and tags (data/tags.js, built from the price sheet) via search.js.
  // score() → 3 exact name · 2 name/brand · 1 tag · 0 no match.
  const TAGS = window.PACE_TAGS || { items: {}, synonyms: [] };
  const searchIndex = window.PaceSearch.build(catalog.map((it) => ({
    id: it.name, name: it.name, aka: it.aka, flavors: it.flavors,
    brand: TAGS.items[it.name]?.brand, tags: TAGS.items[it.name]?.tags || [],
  })), TAGS.synonyms);
  const score = (it, q) => searchIndex.tier(it.name, q);

  // ── Formatting ──
  const money = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const shortDate = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${MONTHS[m - 1]} ${d}`; };
  const locName = (id) => (id ? locations[id].name : "Location not recorded");
  const joinNames = (arr) => arr.length <= 2 ? arr.join(" or ") : `${arr.slice(0, -1).join(", ")} or ${arr.at(-1)}`;

  // ── Photos ──
  // Our own photos (data/my-photos.js) come first. Otherwise only approved
  // Open Food Facts photos ("ok") are shown; see data/photos.js and photo-report.md.
  const MY_PHOTOS = window.PACE_MY_PHOTOS || {};
  const OFF_PHOTOS = window.PACE_PHOTOS || {};
  // { file, source? } — source is set only for Open Food Facts photos (needs a credit).
  function photoFor(name) {
    if (MY_PHOTOS[name]) return { file: MY_PHOTOS[name] };
    const p = OFF_PHOTOS[name];
    return p && p.status === "ok" ? { file: p.file, source: p.source } : null;
  }
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
    const p = photoFor(it.name);
    const cls = `thumb${big ? " big" : ""}`;
    if (p) return `<img class="${cls}" src="${esc(p.file)}" alt="" loading="lazy" decoding="async">`;
    const icon = it.energy ? CATEGORY_ICONS.Energy : it.highProtein ? CATEGORY_ICONS.Protein
      : CATEGORY_ICONS[it.category] || CATEGORY_ICONS.Snacks;
    return `<span class="${cls} icon">${icon}</span>`;
  }

  // ── Caffeine ──
  // "200mg" or "75–110mg" (a range when the flavor isn't known).
  const cafAmount = (c) => `${c.mg}${c.max ? `–${c.max}` : ""}mg`;
  const cafTag = (c) => (c ? `<span class="tag caf">${cafAmount(c)} caffeine</span>` : "");
  const proTag = (p) => (p ? `<span class="tag pro">${p.g}g protein</span>` : "");
  // Caffeine and protein tags for a card ("" if the item has neither).
  const nutritionTags = (it) => cafTag(it.caffeine) + proTag(it.protein);

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
          ? "No problem! Without your location, Devil Bites sorts by lowest price instead. You can turn location on for this site in your browser settings anytime."
          : "Couldn’t find your location just now, so you’re seeing the lowest prices first. Try again in a moment.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  // ── Browse ──
  // Drinks / Snacks go by category; Energy / Protein / Healthy go by the item's
  // flags, so an item can be in two (Muscle Milk is a drink and high protein).
  const FILTERS = ["All", "Drinks", "Snacks", "Energy", "Protein", "Healthy", "Low calorie"];
  // Low calorie comes from the tags (data/tags.js). "variants" items (Coke, Pepsi…)
  // count only at spots where a diet / zero version was recorded.
  const LOW_CAL_FLAVOR = new RegExp(TAGS.lowCalFlavor || "\\bdiet\\b|\\bzero\\b", "i");
  catalog.forEach((it) => (it.lowCal = TAGS.items[it.name]?.lowCal || null));
  const LOW_CAL_SCOPES = ["All", "Drinks", "Snacks"];
  let lowCalScope = store.get("lowCalScope", "All");
  if (!LOW_CAL_SCOPES.includes(lowCalScope)) lowCalScope = "All";

  const inFilter = (it, f) => f === "All" ? true
    : f === "Energy" ? !!it.energy
    : f === "Protein" ? !!it.highProtein
    : f === "Healthy" ? !!it.healthy
    : f === "Low calorie" ? !!it.lowCal && (lowCalScope === "All" || it.category === lowCalScope)
    : it.category === f;
  // The diet / zero flavors at one spot ("Diet Coke, Coke Zero"), or "" if none.
  const lowCalFlavors = (e) => flavorList(e).filter((s) => LOW_CAL_FLAVOR.test(s)).join(", ");

  // `only` sorts appear only with that chip selected.
  const SORTS = [
    { id: "price-asc",  label: "Price ↑",       full: "Price low to high" },
    { id: "caffeine",   label: "Most caffeine", full: "Most caffeine first", only: "Energy" },
    { id: "protein",    label: "Most protein",  full: "Most protein first", only: "Protein" },
    { id: "value",      label: "Best value",    full: "Best value: cheapest per 20g of protein", only: "Protein" },
    { id: "price-desc", label: "Price ↓",       full: "Price high to low" },
    { id: "closest",    label: "Closest",       full: "Closest to me", needsLocation: true },
  ];
  const needsLocation = (id) => SORTS.some((s) => s.id === id && s.needsLocation);
  const sortFits = (id, f) => SORTS.some((s) => s.id === id && (!s.only || s.only === f));

  let filter = store.get("filter", "All");
  let sort = store.get("sort", "price-asc");
  if (!FILTERS.includes(filter)) filter = "All";
  // Location sorts aren't restored on reload, so the app never asks for location on its own.
  if (!sortFits(sort, filter) || needsLocation(sort)) sort = "price-asc";

  const mgOf = (it) => (it.caffeine ? it.caffeine.max || it.caffeine.mg : null);
  const gOf = (it) => (it.protein ? it.protein.g : null);
  const per20 = (price, g) => (price / g) * 20;

  const byNameNumeric = (a, b) => a.item.localeCompare(b.item, undefined, { numeric: true });

  function browseRows() {
    const q = $q.value.trim();
    const rows = [];
    for (const it of catalog) {
      if (!inFilter(it, filter)) continue;
      const s = q ? score(it, q) : 0;
      if (q && !s) continue;
      for (const e of it.entries) {
        let lowLabel = "";
        if (filter === "Low calorie" && it.lowCal === "variants") {
          lowLabel = lowCalFlavors(e);
          if (!lowLabel) continue; // this spot only has the regular version
        }
        rows.push({ ...e, it, match: s, mins: walkMins(e.loc), lowLabel });
      }
    }
    const unpricedLast = (a, b) => (a.price == null) - (b.price == null);
    const noDistanceLast = (a, b) => (a.mins == null) - (b.mins == null);

    // Most caffeine / most protein / best value: items without the number go last.
    const missingLast = (f) => (a, b) => (f(a) == null) - (f(b) == null);
    let bySort;
    if (sort === "caffeine") {
      const mg = (r) => mgOf(r.it);
      bySort = (a, b) => missingLast(mg)(a, b) || mg(b) - mg(a) || unpricedLast(a, b) || a.price - b.price || byNameNumeric(a, b);
    } else if (sort === "protein") {
      const g = (r) => gOf(r.it);
      bySort = (a, b) => missingLast(g)(a, b) || g(b) - g(a) || unpricedLast(a, b) || a.price - b.price || byNameNumeric(a, b);
    } else if (sort === "value") {
      const v = (r) => (gOf(r.it) && r.price != null ? per20(r.price, gOf(r.it)) : null);
      bySort = (a, b) => missingLast(v)(a, b) || v(a) - v(b) || unpricedLast(a, b) || byNameNumeric(a, b);
    } else if (sort === "closest") {
      bySort = (a, b) => noDistanceLast(a, b) || a.mins - b.mins || unpricedLast(a, b) || a.price - b.price || byNameNumeric(a, b);
    } else if (sort === "price-desc") {
      bySort = (a, b) => unpricedLast(a, b) || b.price - a.price || byNameNumeric(a, b);
    } else {
      // Price low to high (the default)
      bySort = (a, b) => unpricedLast(a, b) || a.price - b.price || byNameNumeric(a, b);
    }
    // While searching: exact name first, then name/brand, then tag matches;
    // within each, the chosen sort (cheapest first by default).
    rows.sort((a, b) => (q ? b.match - a.match : 0) || bySort(a, b));
    return rows;
  }

  function browseRow(r) {
    const { a } = itemFacts.get(r.it);
    const isBest = a.hasCompare && r.loc && r.price === a.min;
    const unpriced = r.price == null;
    const where = [locName(r.loc), r.size].filter(Boolean).join(" · ");
    // A div (not a button) so the "See all" flavors button can sit inside it.
    return `
      <div class="card row${unpriced ? " unpriced" : ""}" role="link" tabindex="0" data-item="${esc(r.item)}">
        ${thumb(r.it)}
        <span class="card-main">
          <p class="place">${esc(r.item)}</p>
          <p class="where">${esc(where)}</p>
          ${flavorLine(r)}
          ${isBest || r.it.caffeine || r.it.protein || r.lowLabel ? `<span class="tags">${isBest ? `<span class="tag">Best price</span>` : ""}${
            r.lowLabel ? `<span class="tag low">${esc(r.lowLabel)}</span>` : ""}${nutritionTags(r.it)}</span>` : ""}
        </span>
        <span class="price-col">
          <span class="price">${unpriced ? "No price yet" : "$" + r.price.toFixed(2)}</span>
          ${unpriced ? "" : shelfNote(r)}
          ${sort === "value" && !unpriced && gOf(r.it) ? `<span class="per">$${per20(r.price, gOf(r.it)).toFixed(2)} per 20g</span>` : ""}
          ${r.mins != null ? `<span class="walk">${walkLabel(r.mins)}</span>` : ""}
        </span>
      </div>`;
  }

  // ── Flavors on a card ──
  // "5 flavors: Blondies Chocolate Chip, Chocolate Chip, Dunkin' Mocha Latte, … See all"
  const SHOWN_FLAVORS = 3;
  const ASSORTED = /^(assorted|varying|various)\b/i;
  function flavorLine(e) {
    const list = flavorList(e);
    if (!list.length) return "";
    if (list.every((f) => ASSORTED.test(f))) return `<p class="flavors">Assorted flavors</p>`;
    const label = list.length === 1 ? "Flavor" : `${list.length} flavors`;
    if (list.length <= SHOWN_FLAVORS + 1) {
      return `<p class="flavors"><strong>${label}:</strong> ${esc(list.join(", "))}</p>`;
    }
    return `<p class="flavors"><strong>${label}:</strong>
      <span class="fl-short">${esc(list.slice(0, SHOWN_FLAVORS).join(", "))}, …</span>
      <span class="fl-full" hidden>${esc(list.join(", "))}</span>
      <button type="button" class="fl-more" data-more aria-expanded="false">See all</button></p>`;
  }
  function toggleFlavors(btn) {
    const p = btn.closest(".flavors");
    const open = btn.getAttribute("aria-expanded") !== "true";
    p.querySelector(".fl-short").hidden = open;
    p.querySelector(".fl-full").hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Show less" : "See all";
  }

  function renderBrowse() {
    $filters.innerHTML = FILTERS.map((f) =>
      `<button type="button" class="chip" data-filter="${f}" aria-pressed="${f === filter}">${f}</button>`).join("");
    $sorts.innerHTML = SORTS.filter((s) => !s.only || s.only === filter).map((s) =>
      `<button type="button" class="sort" data-sort="${s.id}" aria-pressed="${s.id === sort}" aria-label="${s.full}" title="${s.full}"${locating ? " disabled" : ""}>${s.label}</button>`).join("");

    // Low calorie: small All / Drinks / Snacks toggle under the chips.
    const $scope = $("lowcal-scope");
    $scope.hidden = filter !== "Low calorie";
    if (!$scope.hidden) {
      $scope.innerHTML = LOW_CAL_SCOPES.map((s) =>
        `<button type="button" class="scope" data-scope="${s}" aria-pressed="${s === lowCalScope}">${s}</button>`).join("");
    }

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
      const elsewhere = filter !== "All" && catalog.some((it) => score(it, raw) > 0);
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
    // "Hit your protein goal" shows under the list with the Protein chip.
    $("protein-goal-box").hidden = filter !== "Protein" || !!raw;
    if (filter === "Protein") renderProteinGoal();
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
    // A chip-only sort (e.g. Most caffeine) goes back to price when its chip is left.
    if (!sortFits(sort, filter)) { sort = "price-asc"; store.set("sort", sort); }
    renderBrowse();
  }

  $q.addEventListener("input", renderBrowse);
  $q.addEventListener("keydown", (e) => { if (e.key === "Enter") $q.blur(); });
  $clear.addEventListener("click", () => { $q.value = ""; renderBrowse(); $q.focus(); });

  $filters.addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (b) setFilter(b.dataset.filter);
  });
  $("lowcal-scope").addEventListener("click", (e) => {
    const b = e.target.closest("[data-scope]");
    if (!b) return;
    lowCalScope = b.dataset.scope;
    store.set("lowCalScope", lowCalScope);
    renderBrowse();
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
    const more = e.target.closest("[data-more]");
    if (more) return toggleFlavors(more); // "See all" opens the list, not the item
    const f = e.target.closest("[data-filter]");
    if (f) return setFilter(f.dataset.filter);
    const b = e.target.closest("[data-item]");
    if (b && byName.has(b.dataset.item)) go("#/item/" + encodeURIComponent(b.dataset.item));
  });
  // Cards are divs, so open them with Enter / Space too.
  $browseList.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".row[data-item]")) {
      e.preventDefault();
      go("#/item/" + encodeURIComponent(e.target.dataset.item));
    }
  });

  // ── Item price comparison ──
  $itemDetail.addEventListener("click", (e) => {
    const more = e.target.closest("[data-more]");
    if (more) toggleFlavors(more);
  });

  function metaLine(e, extra) {
    const loc = e.loc && locations[e.loc];
    const bits = [];
    if (loc && loc.area) bits.push(loc.area);
    if (e.size) bits.push(e.size);
    if (e.checked) bits.push(`checked ${shortDate(e.checked)}`);
    let html = bits.length ? esc(bits.join(" · ")) : "";
    if (extra) html += (html ? "<br>" : "") + extra;
    if (e.note) html += (html ? "<br>" : "") + `<span class="note">${esc(e.note)}</span>`;
    return html ? `<p class="meta">${html}</p>` : "";
  }

  function priceCard(e, isBest, saveLine = "") {
    const unpriced = e.price == null;
    const mins = walkMins(e.loc);
    return `
      <article class="card${isBest ? " best" : ""}${unpriced ? " unpriced" : ""}">
        <div class="card-main">
          <p class="place">${esc(locName(e.loc))}</p>
          ${isBest ? `<p class="best-label">Best price</p>` : ""}
          ${isBest && saveLine ? `<p class="save-line">${esc(saveLine)}</p>` : ""}
          ${flavorLine(e)}
          ${metaLine(e, unpriced ? "Price not confirmed yet" : "")}
        </div>
        <span class="price-col">
          <span class="price">${unpriced ? "—" : e.tax ? "$" + e.price.toFixed(2) : money(e.price)}</span>
          ${unpriced ? "" : shelfNote(e)}
          ${mins != null ? `<span class="walk">${walkLabel(mins)}</span>` : ""}
        </span>
      </article>`;
  }

  function renderItem(it) {
    const a = analyze(it);
    const isMeal = it.category === "Meals";
    const n = new Set(a.known.map((e) => e.loc)).size;
    const photo = photoFor(it.name);
    const credit = photo && photo.source
      ? `<p class="photo-credit"><a href="${esc(photo.source)}" target="_blank" rel="noopener">Photo: Open Food Facts</a></p>` : "";
    let html = `<div class="item-head">${thumb(it, true)}<div>
      <h1 class="item-name">${esc(it.name)}</h1>
      ${n ? `<p class="count">${n} ${n === 1 ? "place" : "places"} ${isMeal ? "serve" : "sell"}${n === 1 ? "s" : ""} this</p>`
          : `<p class="count">Where it’s sold hasn’t been recorded yet</p>`}
      ${credit}</div></div>`;
    const c = it.caffeine;
    if (c) {
      html += `<p class="caf-line"><strong>${cafAmount(c)} caffeine</strong>${c.size ? ` in ${esc(c.size)}` : ""}${
        c.note ? `<br><span class="meta">${esc(c.note)}</span>` : ""}</p>`;
    }
    if (it.protein) {
      html += `<p class="pro-line"><strong>${it.protein.g}g protein</strong></p>`;
    }

    // Cheapest vs. most expensive spot, used for the "You save" line and the tip.
    const cheap = joinNames([...new Set(a.priced.filter((e) => e.price === a.min).map((e) => locName(e.loc)))]);
    const priceyNames = [...new Set(a.priced.filter((e) => e.price === a.max).map((e) => locName(e.loc)))];
    const pricey = priceyNames.length > 1 && priceyNames.every((x) => / vending$/.test(x)) ? "vending"
      : priceyNames.length > 2 ? "the other spots" : joinNames(priceyNames);
    const diff = a.hasCompare ? a.max - a.min : 0;
    const saveLine = a.hasCompare ? `You save $${diff.toFixed(2)} by buying here instead of ${pricey}.` : "";

    if (a.priced.length || a.unpriced.length) {
      html += `<div class="cards">`;
      html += a.priced.map((e) => priceCard(e, a.hasCompare && e.price === a.min, saveLine)).join("");
      html += a.unpriced.map((e) => priceCard(e, false)).join("");
      html += `</div>`;
    }

    if (a.hasCompare) {
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
    document.title = `${it.name} · Devil Bites`;
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
            <span class="deal-price">$${a.min.toFixed(2)}${shelfNote(a.priced.find((e) => e.price === a.min))}</span>
          </span>
          ${save ? `<span class="deal-row">
            <span class="deal-label">Priciest</span>
            <span class="deal-spot">${esc(spotList(a.priced, a.max))}</span>
            <span class="deal-price">$${a.max.toFixed(2)}${shelfNote(a.priced.find((e) => e.price === a.max))}</span>
          </span>` : ""}
        </span>
      </button>`;
  }

  function renderDeals() {
    const gaps = deals.filter((d) => d.gap > 0), same = deals.filter((d) => d.gap === 0);
    $("deals-list").innerHTML = gaps.map(dealCard).join("")
      + (same.length ? `<p class="section-label">Same price everywhere (${same.length})</p>` + same.map(dealCard).join("") : "");
  }
  $("deals-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-item]");
    if (b) location.hash = "#/deals/item/" + encodeURIComponent(b.dataset.item);
  });

  // ── Protein goal (shown on Browse with the Protein chip) ──
  // Cheapest combo of items with a protein amount, each at its cheapest spot.
  const MAX_EACH = 2; // the goal combo uses at most this many of the same item
  const proteinItems = catalog
    .filter((it) => it.protein && itemFacts.get(it).a.priced.length)
    .map((it) => {
      const { a } = itemFacts.get(it);
      return { it, a, g: it.protein.g, price: a.min };
    });

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
        $s.textContent = d > 0 ? `You’re $${d.toLocaleString("en-US")} ahead. Treat yourself.`
          : d < 0 ? `You’re $${(-d).toLocaleString("en-US")} behind. Here’s an easy fix.` : "You’re right on pace";
        $s.className = "pace-status " + (d > 0 ? "ahead" : d < 0 ? "behind" : "on");
      }
      // The fix when behind: catch up in 2 weeks if that's possible, otherwise
      // stick to the daily budget until the last day.
      const $c = $("pace-catchup");
      const behind = p.balance != null && Math.round(p.balance - p.expected) < 0;
      $c.hidden = !(behind && p.ready && p.daily != null);
      if (!$c.hidden) {
        $c.innerHTML = p.catchUp > 0
          ? `To catch up in 2 weeks, spend <strong>${dollars(p.catchUp)} a ${dayWord}</strong>.`
          : `Stick to <strong>${dollars(p.daily)} a ${dayWord}</strong> until you leave and you’ll make it.`;
      }
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
  //   #/me   (old #/caffeine and #/protein links open Browse)
  // An item opened from Deals lives under #/deals/… so the Deals tab stays lit.
  const TAB_NAMES = { browse: "Browse", deals: "Deals", me: "My Pace" };
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
        tab = TAB_NAMES[m[1]] ? m[1] : "browse";
      }
    } else if (["deals", "me"].includes(h)) view = tab = h;
    if (view === "me") renderPace(); // keeps "today" right if the app was left open overnight

    if (current && current !== "item") scrollMemory[current] = window.scrollY;
    if (view === "item") { if (current !== "item") prevList = current; }
    else prevList = null;

    views.forEach((v) => (v.hidden = v.id !== "view-" + view));
    document.querySelectorAll(".tab").forEach((t) =>
      t.dataset.tab === tab ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current"));
    $("back-label").textContent = TAB_NAMES[tab] || "Browse";
    if (view !== "item") document.title = "Devil Bites";

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
  renderPace();
  route();
})();
