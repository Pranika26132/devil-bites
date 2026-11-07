// Finds a product photo for each item on Open Food Facts and saves it to images/.
//
//   node tools/fetch-photos.mjs           fetch photos for items that don't have one yet
//   node tools/fetch-photos.mjs --all     re-check every item
//
// Writes:
//   images/<item>.jpg     the photos
//   data/photos.js        which photo belongs to which item (the app reads this)
//   photo-report.md       found / no match / please check
//
// Photos are © Open Food Facts contributors, CC BY-SA. The app shows that credit.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = path.join(ROOT, "images");
const PHOTOS_JS = path.join(ROOT, "data", "photos.js");
const REPORT = path.join(ROOT, "photo-report.md");
const UA = "PaceStudentApp/0.1 (Duke student price-comparison project)";
const SEARCH = "https://search.openfoodfacts.org/search";
const DELAY_MS = 2000; // be gentle with a free API

// What to search for each item: [brand, product words]. null = generic item with
// no brand to look up (it gets the category icon instead).
const QUERIES = {
  "Bubbl’r sparkling water": ["Bubblr", "antioxidant sparkling water"],
  "Coca-Cola / Diet Coke": ["Coca-Cola", "coca-cola original"],
  "Soda cans, 12 oz": null,
  "Sprite": ["Sprite", "lemon lime soda"],
  "Dr Pepper": ["Dr Pepper", "soda"],
  "Fanta": ["Fanta", "soda"],
  "Minute Maid juice": ["Minute Maid", "juice"],
  "Red Bull 8.4 oz": ["Red Bull", "energy drink"],
  "Red Bull 12 oz": ["Red Bull", "energy drink"],
  "Red Bull 16 oz": ["Red Bull", "energy drink"],
  "Red Bull 20 oz": ["Red Bull", "energy drink"],
  "Red Bull 4-pack": ["Red Bull", "energy drink"],
  "Poppi": ["Poppi", "prebiotic soda"],
  "Pepsi": ["Pepsi", "cola"],
  "Mountain Dew": ["Mountain Dew", "soda"],
  "Sunkist": ["Sunkist", "grape soda"],
  "Schweppes Ginger Ale": ["Schweppes", "ginger ale"],
  "Root-beer-style soda (brand unread)": null,
  "Red-label soda (brand unread)": null,
  "Ocean Spray juice": ["Ocean Spray", "cranberry juice"],
  "Dole apple juice": ["Dole", "apple juice"],
  "Muscle Milk": ["Muscle Milk", "protein shake"],
  "Starbucks Frappuccino": ["Starbucks", "frappuccino"],
  "Starbucks Doubleshot Energy": ["Starbucks", "doubleshot energy"],
  "Spylt protein milk": ["Spylt", "protein milk"],
  "Rockstar Energy": ["Rockstar", "energy drink"],
  "Mtn Dew Kickstart": ["Mountain Dew", "kickstart"],
  "Lipton iced tea, 20 oz bottle": ["Lipton", "green tea"],
  "Lipton iced tea, 16 oz can": ["Lipton", "iced tea lemonade"],
  "Bottled water, blue label (brand unread)": null,
  "Naked Juice": ["Naked", "green machine juice"],
  "Iced tea cans, dark blue (brand unread)": null,
  "Gatorade": ["Gatorade", "thirst quencher"],
  "Celsius": ["Celsius", "energy drink"],
  "Alani energy drink": ["Alani Nu", "energy drink"],
  "LIFEWTR": ["LIFEWTR", "water"],
  "Propel": ["Propel", "electrolyte water"],
  "Vitaminwater": ["Vitaminwater", "water"],
  "Gold Peak tea": ["Gold Peak", "sweet tea"],
  "Storm Energy": ["Storm", "energy drink"],
  "Topo Chico": ["Topo Chico", "mineral water"],
  "BodyArmor": ["BodyArmor", "sports drink"],
  "Powerade": ["Powerade", "sports drink"],
  "Powerade Zero": ["Powerade", "zero"],
  "Dasani water": ["Dasani", "water"],
  "Aquafina (plastic bottle)": ["Aquafina", "water"],
  "Aquafina (metal bottle)": ["Aquafina", "water"],
  "Slate Milk": ["Slate", "chocolate milk"],
  "C4 Energy": ["C4", "energy drink"],
  "Monster Energy": ["Monster", "energy ultra"],
  "OLIPOP": ["Olipop", "soda"],
  "Spindrift": ["Spindrift", "sparkling water"],
  "Kombucha": null,
  "Open Water": ["Open Water", "still water aluminum bottle"],
  "Chobani Greek Yogurt Drink": ["Chobani", "protein drink"],

  "Barebells protein bar": ["Barebells", "protein bar"],
  "Oikos yogurt": ["Oikos", "greek yogurt"],
  "Quest protein bar": ["Quest", "protein bar"],
  "Quest protein cookie": ["Quest", "protein cookie"],
  "Quest frosted cookie": ["Quest", "frosted cookie"],
  "Quest peanut butter cups": ["Quest", "peanut butter cups"],
  "think! protein bar": ["think!", "protein bar"],
  "Clif Bar": ["Clif Bar", "chocolate chip energy bar"],
  "Kind bar": ["Kind", "bar"],
  "PowerBar": ["PowerBar", "protein bar"],
  "belVita breakfast biscuits": ["belVita", "breakfast biscuits"],
  "Nature Valley Crunchy Oats ’n Honey": ["Nature Valley", "oats n honey"],
  "Nature Valley Almond Butter Biscuits": ["Nature Valley", "almond butter biscuits"],
  "Nature Valley Fruit & Nut bar": ["Nature Valley", "fruit nut"],
  "Beef jerky": null,

  "Lance Captain’s Wafers": ["Lance", "captain's wafers"],
  "Lance Nekot cookies": ["Lance", "nekot"],
  "Lance Toast Chee crackers": ["Lance", "toastchee"],
  "Cheetos": ["Cheetos", "crunchy"],
  "Smartfood popcorn": ["Smartfood", "white cheddar popcorn"],
  "Popchips": ["Popchips", "potato"],
  "Cheez-It": ["Cheez-It", "original"],
  "Snyder’s mini pretzels": ["Snyder's", "mini pretzels"],
  "Garden Veggie Straws": ["Sensible Portions", "garden veggie straws"],
  "Bugles": ["Bugles", "nacho cheese"],
  "Goldfish": ["Goldfish", "cheddar crackers"],
  "Lay’s potato chips": ["Lay's", "classic potato chips"],
  "Doritos": ["Doritos", "nacho cheese"],
  "Fritos Flavor Twists": ["Fritos", "flavor twists honey bbq"],
  "Sun Chips": ["SunChips", "multigrain"],
  "Ruffles": ["Ruffles", "flamin hot"],
  "Takis": ["Takis", "fuego"],
  "Chex Mix": ["Chex Mix", "traditional"],
  "Oreo": ["Oreo", "cookies"],
  "Roasted pistachios": null,
  "Kar’s trail mix with M&M’s": ["Kar's", "sweet salty mix"],
  "Welch’s fruit snacks": ["Welch's", "mixed fruit snacks"],
  "Gushers": ["Gushers", "fruit snacks"],

  "Jolly Rancher sour gummies": ["Jolly Rancher", "sour gummies"],
  "Albanese gummy worms": ["Albanese", "gummi worms"],
  "Trolli sour gummies": ["Trolli", "sour brite crawlers"],
  "Mike and Ike": ["Mike and Ike", "original fruits"],
  "Nerds gummy clusters": ["Nerds", "gummy clusters"],
  "Crunch bar": ["Crunch", "milk chocolate crisped rice"],
  "SweeTarts Mini Chewy": ["SweeTarts", "mini chewy"],
  "AWAKE caffeinated chocolate": ["Awake", "caffeinated chocolate"],
  "Snickers": ["Snickers", "chocolate bar"],
  "Snickers King Size": ["Snickers", "chocolate bar"],
  "M&M’s": ["M&M's", "milk chocolate"],
  "M&M’s King Size": ["M&M's", "milk chocolate"],
  "Kit Kat": ["Kit Kat", "wafer bar"],
  "Reese’s Peanut Butter Cups": ["Reese's", "peanut butter cups"],
  "Reese’s Sticks": ["Reese's", "sticks"],
  "Reese’s White": ["Reese's", "white peanut butter cups"],
  "Kinder Bueno": ["Kinder", "bueno"],
  "Haribo Goldbears": ["Haribo", "goldbears"],
  "Sour Patch Kids": ["Sour Patch Kids", "watermelon"],
  "Skittles Gummies": ["Skittles", "gummies"],
  "Zagnut": ["Zagnut", "bar"],
  "Twix King Size": ["Twix", "caramel cookie bars"],
  "Butterfinger": ["Butterfinger", "bar"],
  "Mr. Goodbar King Size": ["Hershey's", "mr goodbar"],
  "Now & Later": ["Now and Later", "chews"],
  "Ghirardelli chocolate squares": ["Ghirardelli", "chocolate squares"],

  "Trident gum, 14 sticks": ["Trident", "gum"],
  "Trident White gum, 16 pieces": ["Trident", "white gum"],
  "Trident Vibes gum, 40 pieces": ["Trident", "vibes gum"],
  "Gum 28-pack (brand unclear)": null,
  "Wrigley’s 5 gum, 15 sticks": ["5", "gum"],
  "Wrigley’s 5 gum, mega pack": ["5", "gum"],
  "Mentos gum": ["Mentos", "gum"],
  "Altoids": ["Altoids", "curiously strong peppermints"],
  "Ice Breakers mints": ["Ice Breakers", "mints"],
  "Juicy Fruit gum": ["Juicy Fruit", "gum"],
  "Winterfresh gum": ["Winterfresh", "gum"],
  "Big Red gum": ["Big Red", "cinnamon gum"],
  "Doublemint gum": ["Doublemint", "gum"],

  "Chickpea stew": null,
};

// Matches that scored well but that a person looked at and wasn't sure about.
// These are saved as "check" (hidden in the app) with the reason shown in the report.
const REVIEW = {
  "Crunch bar": "matched product may not be the Crunch brand bar",
  "Chobani Greek Yogurt Drink": "matched a Chobani yogurt cup, not the drink",
  "think! protein bar": "matched the think! kids bar",
  "Minute Maid juice": "matched Minute Maid juice sticks, not a bottle",
  "Dr Pepper": "matched Dr Pepper & Cream Soda, a different flavor",
  "Nature Valley Fruit & Nut bar": "matched a trail mix, not the bar",
  "Reese’s Peanut Butter Cups": "matched the organic version",
  "Oikos yogurt": "matched a whole-milk Oikos flavor; the one sold may be Oikos Pro",
  "Dole apple juice": "matched Dole juice gels, not apple juice",
  "Celsius": "matched a Celsius powder packet, not a can",
  "Sunkist": "matched Sunkist orange; the shop sells grape",
  // Looked at the photos themselves:
  "Snickers": "photo shows the nutrition label, not the front",
  "Snickers King Size": "photo shows the nutrition label, not the front",
  "Albanese gummy worms": "photo is a blank lid, product not visible",
  "Now & Later": "photo is blurry",
  "Twix King Size": "photo is too dark to recognize",
  "Ghirardelli chocolate squares": "photo is too dark to recognize",
  "Winterfresh gum": "photo shows Extra Winterfresh, a different gum",
  "C4 Energy": "photo shows a multi-pack case, not a can",
};

// ── helpers ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[’'`!.]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter((w) => w.length > 1 || /\d/.test(w));
const slug = (s) => norm(s).replace(/ /g, "-").slice(0, 60);

function loadPriceData() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data", "prices.js"), "utf8"), ctx);
  return ctx.window.PACE_DATA;
}
function loadExistingPhotos() {
  if (!fs.existsSync(PHOTOS_JS)) return {};
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(PHOTOS_JS, "utf8"), ctx);
  return ctx.window.PACE_PHOTOS || {};
}

async function getJSON(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status >= 500) { await sleep(5000 * (i + 1)); continue; }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(5000 * (i + 1));
    }
  }
}

// Scores one search hit against what we asked for.
function judge(hit, brand, terms) {
  const brandWords = words(brand);
  const termWords = words(terms).filter((w) => !brandWords.includes(w));
  const text = " " + words([...(hit.brands || []), hit.product_name || ""].join(" ")).join(" ") + " ";
  const compact = text.replace(/ /g, "");
  const brandHit = brandWords.length > 0 && (brandWords.every((w) => text.includes(` ${w} `))
    || compact.includes(brandWords.join("")));
  const covered = termWords.filter((w) => text.includes(` ${w}`)).length;
  const coverage = termWords.length ? covered / termWords.length : 1;
  const us = (hit.countries_tags || []).includes("en:united-states");
  const english = /^[\x00-\x7F’]*$/.test(hit.product_name || "");
  const scans = Math.log10(1 + (hit.unique_scans_n || 0));
  const score = (brandHit ? 3 : 0) + 2 * coverage + (us ? 0.8 : 0) + (english ? 0.3 : 0) + 0.2 * scans;
  return { brandHit, coverage, us, score };
}

async function findPhoto(brand, terms) {
  const q = `${brand} ${terms}`;
  const url = `${SEARCH}?${new URLSearchParams({
    q, page_size: "24",
    fields: "code,product_name,brands,image_front_small_url,image_front_url,countries_tags,unique_scans_n",
  })}`;
  const data = await getJSON(url);
  const hits = (data.hits || []).filter((h) => h.image_front_small_url || h.image_front_url);
  if (!hits.length) return null;
  const ranked = hits.map((h) => ({ h, j: judge(h, brand, terms) })).sort((a, b) => b.j.score - a.j.score);
  const { h, j } = ranked[0];
  const confident = j.brandHit && j.coverage >= 0.5;
  const reasons = [];
  if (!j.brandHit) reasons.push("brand name not on the matched product");
  if (j.coverage < 0.5) reasons.push("product name only partly matches");
  if (!j.us) reasons.push("non-US product listing");
  return {
    code: h.code,
    match: [h.product_name, (h.brands || []).join(", ")].filter(Boolean).join(" — "),
    imageUrl: h.image_front_small_url || h.image_front_url,
    status: confident ? "ok" : "check",
    reason: confident ? (j.us ? "" : "matched, but listed outside the US (packaging may differ)") : reasons.join("; "),
  };
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`image HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ── main ──
const all = process.argv.includes("--all");
const { items } = loadPriceData();
const photos = all ? {} : loadExistingPhotos();
const results = {};                 // item -> { status, ... }
const byQuery = new Map();          // reuse one lookup for items with the same query
fs.mkdirSync(IMAGES, { recursive: true });

const missingConfig = Object.keys(items).filter((n) => !(n in QUERIES));
if (missingConfig.length) console.warn("No search set up for:", missingConfig.join(", "));

for (const name of Object.keys(items)) {
  const qcfg = QUERIES[name];
  if (!qcfg) { results[name] = { status: "none", reason: qcfg === null ? "generic item, no brand to search" : "no search set up" }; continue; }
  if (photos[name] && photos[name].status !== "check") {
    const kept = { ...photos[name], kept: true };
    // A photo you approved (status changed from "check" to "ok") keeps its "flag" and stays approved.
    if (REVIEW[name] && kept.status === "ok" && !kept.flag) Object.assign(kept, { status: "check", reason: REVIEW[name] });
    results[name] = kept;
    continue;
  }

  const key = qcfg.join("|");
  let found = byQuery.get(key);
  if (found === undefined) {
    process.stdout.write(`Searching ${qcfg.join(" ")} … `);
    try {
      found = await findPhoto(...qcfg);
      console.log(found ? `${found.status}: ${found.match}` : "no match");
    } catch (e) {
      console.log("error:", e.message);
      found = { error: e.message };
    }
    byQuery.set(key, found);
    await sleep(DELAY_MS);
  }
  if (found && !found.error && REVIEW[name] && found.status === "ok") {
    found = { ...found, status: "check", reason: REVIEW[name] };
  }
  if (!found || found.error) {
    results[name] = { status: "none", reason: found ? `lookup failed (${found.error})` : "no product with a photo found" };
    continue;
  }

  const file = `images/${slug(qcfg.join(" "))}.jpg`;
  const dest = path.join(ROOT, file);
  try {
    if (!fs.existsSync(dest) || all) await download(found.imageUrl, dest);
    results[name] = {
      file, status: found.status, match: found.match, reason: found.reason,
      source: `https://world.openfoodfacts.org/product/${found.code}`,
    };
  } catch (e) {
    results[name] = { status: "none", reason: `image download failed (${e.message})` };
  }
}

// data/photos.js — only items that have a photo file
const out = {};
for (const [name, r] of Object.entries(results)) {
  if (r.file) {
    out[name] = { file: r.file, status: r.status, match: r.match, source: r.source };
    const flag = r.status === "check" ? r.reason : r.flag;
    if (flag) out[name].flag = flag;
  }
}
fs.writeFileSync(PHOTOS_JS, `/*
  Product photos — generated by tools/fetch-photos.mjs from Open Food Facts
  (images © Open Food Facts contributors, CC BY-SA). See photo-report.md.

  status "ok"    → shown in the app
  status "check" → saved, but hidden until you look at it and change it to "ok"
                   ("flag" says why it was flagged; re-running the script keeps your approval)
  Delete an entry (or set status "no") to drop a wrong photo.
*/
window.PACE_PHOTOS = ${JSON.stringify(out, null, 2)};
`);

// After a full re-run, delete photos no item uses any more.
if (all) {
  const used = new Set(Object.values(out).map((p) => path.basename(p.file)));
  for (const f of fs.readdirSync(IMAGES)) if (!used.has(f)) fs.unlinkSync(path.join(IMAGES, f));
}

// photo-report.md
const group = (s) => Object.entries(results).filter(([, r]) => r.status === s);
const ok = group("ok"), check = group("check"), none = group("none");
const line = ([n, r]) => `- **${n}** → ${r.match} · [view on Open Food Facts](${r.source})${r.reason ? ` · _${r.reason}_` : ""}`;
fs.writeFileSync(REPORT, `# Product photo report

Generated ${new Date().toISOString().slice(0, 10)} by \`node tools/fetch-photos.mjs\`.
Photos from Open Food Facts, CC BY-SA.

**${ok.length} found · ${check.length} to check · ${none.length} no photo**

## Please check (${check.length})
These were saved but are **hidden in the app** until you approve them: open
\`data/photos.js\` and change \`"status": "check"\` to \`"ok"\` for the ones that look right.

${check.map(line).join("\n") || "_None_"}

## No photo (${none.length})
These show a category icon instead.

${none.map(([n, r]) => `- **${n}** — ${r.reason}`).join("\n") || "_None_"}

## Found (${ok.length})
Brand and product name matched. Worth a quick glance, since one photo can stand in
for several flavors or sizes.

${ok.map(line).join("\n") || "_None_"}
`);

console.log(`\nDone: ${ok.length} found, ${check.length} to check, ${none.length} no photo.`);
console.log("Wrote data/photos.js and photo-report.md");
