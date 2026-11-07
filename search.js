/*
  Devil Bites search: matches a query against item names, brands and tags.

    PaceSearch.build(entries, synonyms) → index
      entries: [{ id, name, aka: [], brand, tags: [], flavors: "" }]
    index.tier(id, query) → 3 exact name · 2 name/brand · 1 tag/flavor · 0 no match

  Handles plurals ("candies" = "candy"), word groups ("gum" = "mints"),
  prefixes while typing ("bubb" → Bubbl’r) and small typos ("snikers", "celcius").
  Typos are only fixed when a word isn't a real word in the data, so "water"
  never turns into "wafers".
*/
(function (root) {
  "use strict";

  const norm = (s) => (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’'`!.]/g, "")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  // "candies" → "candy", "cookies" → "cookie", "chips" → "chip"
  const IE_WORDS = /(cook|browni?|smooth|vegg|pi|mov|hood|rook|zomb|self)ies$/;
  const singular = (w) => (w.length > 4 && w.endsWith("ies") && !IE_WORDS.test(w) ? w.slice(0, -3) + "y"
    : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
  const words = (s) => norm(s).split(" ").filter(Boolean).map(singular);

  // Edit distance with swapped letters counted as one edit (stops early past `max`).
  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      let rowMin = Infinity;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        rowMin = Math.min(rowMin, d[i][j]);
      }
      if (rowMin > max) return max + 1;
    }
    return d[a.length][b.length];
  }

  function build(entries, synonyms) {
    const groups = new Map(); // word → Set of words in its group
    for (const g of synonyms || []) {
      const set = new Set(g.flatMap(words));
      for (const w of set) groups.set(w, new Set([...(groups.get(w) || []), ...set]));
    }

    const vocab = new Set();
    const tagVocab = new Set(); // words used in tags anywhere ("candy", "chip", "cookie"…)
    const index = new Map();
    for (const e of entries) {
      const tagWords = new Set((e.tags || []).flatMap(words));
      const tagPhrases = new Set((e.tags || []).map((t) => words(t).join(" ")));
      // Other spellings that are just this item's own tags ("chips", "popcorn")
      // don't count as names, so they can't jump to the top as an exact match.
      const aka = (e.aka || []).filter((a) => !tagPhrases.has(words(a).join(" ")));
      const nameish = new Set([...words(e.name), ...aka.flatMap(words), ...words(e.brand || "")]);
      const flavorWords = new Set(words(e.flavors || ""));
      const flavorText = words(e.flavors || "").join(" ");
      const exact = new Set([e.name, ...aka].flatMap((s) => [norm(s), words(s).join(" ")]));
      const compact = [e.name, ...aka, e.brand || ""].map((s) => norm(s).replace(/ /g, "")).filter(Boolean);
      for (const w of [...nameish, ...tagWords]) vocab.add(w);
      for (const w of tagWords) tagVocab.add(w);
      index.set(e.id, { nameish, tagWords, flavorWords, flavorText, exact, compact });
    }
    for (const g of groups.values()) for (const w of g) { vocab.add(w); tagVocab.add(w); }
    const vocabList = [...vocab];

    // How a single query word matches one item: 2 name/brand, 1 tag/flavor, 0 none.
    function wordLevel(x, t) {
      const isWord = vocab.has(t);
      const has = (set) => set.has(t) || (!isWord && [...set].some((w) => w.startsWith(t)));
      if (has(x.nameish)) return 2;
      if (has(x.tagWords)) return 1;
      // Word groups ("candy" = "sweets") only reach tags, never names.
      for (const v of groups.get(t) || []) if (v !== t && x.tagWords.has(v)) return 1;
      // Flavors count for words that aren't kinds of food ("cherry", not "sweet").
      if (t.length >= 3 && !tagVocab.has(t) && x.flavorWords.has(t)) return 1;
      // Typo: only if the word (or a word starting with it) isn't in the data at all.
      if (t.length >= 4 && !isWord && !vocabList.some((w) => w.startsWith(t))) {
        const max = t.length >= 8 ? 2 : 1;
        if ([...x.nameish].some((w) => distance(t, w, max) <= max)) return 2;
        if ([...x.tagWords].some((w) => distance(t, w, max) <= max)) return 1;
      }
      return 0;
    }

    function tier(id, query) {
      const x = index.get(id);
      const q = norm(query);
      if (!x || !q) return 0;
      if (x.exact.has(q) || x.exact.has(words(q).join(" "))) return 3;
      let level = 2;
      const qWords = words(q);
      for (const t of qWords) {
        level = Math.min(level, wordLevel(x, t));
        if (!level) break;
      }
      // A whole phrase found in the flavors ("sweet tea", "cookies and cream")
      if (!level && qWords.length > 1 && x.flavorText.includes(qWords.join(" "))) level = 1;
      // "redbull", "mms": squashed-together names
      const cq = q.replace(/ /g, "");
      const squashed = cq.length > 2 && x.compact.some((c) => c.startsWith(cq) || (cq.length >= 5 && c.includes(cq)));
      return Math.max(level, squashed ? 2 : 0);
    }

    return { tier, norm };
  }

  const api = { build, norm, singular };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PaceSearch = api;
})(typeof window !== "undefined" ? window : globalThis);
