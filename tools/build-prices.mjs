// Rebuilds data/prices.js from the price sheet.
//
//   node tools/build-prices.mjs                       uses data/prices.csv (or "prices - Sheet1.csv", or a .tsv)
//   node tools/build-prices.mjs path/to/sheet.tsv     (or a .csv)
//
// Cleanup rules:
//   - Spelling duplicates are merged into one item (NAMES below).
//   - Location spellings map to one location (LOCATIONS below).
//   - Different sizes stay separate items (Red Bull 8.4 vs 16 oz, Snickers vs King Size…).
//   - Blank prices stay blank. Nothing is guessed.
//   - Each item's category, other spellings, caffeine and protein are kept from the
//     current data/prices.js; brand-new items get theirs from NEW_ITEMS.
//   - Rows for the same item, place and price are merged (flavors combined).
// Prints what changed compared with the current data/prices.js.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "prices.js");
// Default sheet: the first of these that exists in data/.
const DEFAULT_SHEETS = ["prices.csv", "prices - Sheet1.csv", "prices.tsv", "prices - Sheet1.tsv"];
const SHEET = path.resolve(process.argv[2]
  || path.join(ROOT, "data", DEFAULT_SHEETS.find((f) => fs.existsSync(path.join(ROOT, "data", f))) || DEFAULT_SHEETS[0]));

// ── Location spellings → location id (ids are defined in data/prices.js) ──
const LOCATIONS = {
  "bryan center lobby shop": "lobby",
  "bc lobby shop": "lobby",
  "bc vending": "bcVending",
  "wu vending machine": "wuVending",
  "wu vending": "wuVending",
  "trinity vending machine": "trinityVending",
  "vending machine (trin)": "trinityVending",
  "wu café": "wuCafe",
  "wu cafe": "wuCafe",
  "bella union": "bellaUnion",
  "trinity café": "trinityCafe",
  "trinity cafe": "trinityCafe",
  "wilson café": "wilsonCafe",
  "wilson cafe": "wilsonCafe",
  "tandoor": "tandoor",
  "farmstead": "farmstead",
  "bryan center": "bryanCenter",
};

// ── Item spellings → item name. A function picks by size/price/flavor. ──
const NAMES = {
  "okios yogurt": "Oikos yogurt",
  "oikos yogurt": "Oikos yogurt",
  "bubblr": "Bubbl’r sparkling water",
  "bubbl’r sparkling water": "Bubbl’r sparkling water",
  "coca-cola": "Coca-Cola / Diet Coke",
  "coca-cola / diet coke": "Coca-Cola / Diet Coke",
  "sprite": "Sprite",
  "dr pepper": "Dr Pepper",
  "fanta": "Fanta",
  "minute maid": "Minute Maid juice",
  "minute maid juice": "Minute Maid juice",
  "soda cans": "Soda cans, 12 oz",
  "red bull": (r) => ({ "8.4 oz": "Red Bull 8.4 oz", "12 oz": "Red Bull 12 oz", "16 oz": "Red Bull 16 oz", "20 oz": "Red Bull 20 oz" })[r.size],
  "red bull energy drink": (r) => (/4\s*×/.test(r.size) ? "Red Bull 4-pack" : undefined),
  "poppi cans": "Poppi",
  "poppi": "Poppi",
  "pepsi": "Pepsi",
  "mountain dew": "Mountain Dew",
  "sunkist": "Sunkist",
  "schweppes ginger ale": "Schweppes Ginger Ale",
  "dark-label bottle (brand unread, root-beer style)": "Root-beer-style soda (brand unread)",
  "red-label bottle (brand unread)": "Red-label soda (brand unread)",
  "orange juice": "Orange juice",
  "ocean spray juice cranberry": "Ocean Spray juice",
  "dole apple juice": "Dole apple juice",
  "muscle milk": "Muscle Milk",
  "starbucks frappuccino": "Starbucks Frappuccino",
  "starbucks doubleshot energy cans": "Starbucks Doubleshot Energy",
  "spylt cans": "Spylt protein milk",
  "rockstar cans": "Rockstar Energy",
  "mtn dew amp": "Mtn Dew AMP",
  "mtn dew kickstart cans": "Mtn Dew Kickstart",
  "lipton bottles": "Lipton iced tea, 20 oz bottle",
  "lipton iced tea cans": "Lipton iced tea, 16 oz can",
  "lipton iced tea": "Lipton iced tea, 16 oz can",
  "water bottles, blue caps/blue labels (brand unread)": "Bottled water, blue label (brand unread)",
  "naked juice": "Naked Juice",
  "gatorade bottles": "Gatorade",
  "gatorade": "Gatorade",
  "celsius": "Celsius",
  "alani": "Alani energy drink",
  "life water": "LIFEWTR",
  "lifewtr": "LIFEWTR",
  "propel": "Propel",
  "vitamin water": "Vitaminwater",
  "vitaminwater": "Vitaminwater",
  "vitaminwater zero sugar ice": "Vitaminwater",
  "gold peak": "Gold Peak tea",
  "gold peak tea": "Gold Peak tea",
  "storm energy": "Storm Energy",
  "topo chico": "Topo Chico",
  "body armor": "BodyArmor",
  "bodyarmor": "BodyArmor",
  "powerade zero": "Powerade Zero",
  "powerade": "Powerade",
  "dasani water": "Dasani water",
  "dasani": "Dasani water",
  "aquafina": (r) => (r.price === 3 ? "Aquafina (metal bottle)" : r.price === 2.25 ? "Aquafina (plastic bottle)" : undefined),
  "slate milk": "Slate Milk",
  "c4 energy drink": "C4 Energy",
  "monster energy": "Monster Energy",
  "olipop": "OLIPOP",
  "spindrift": "Spindrift",
  "kombucha": "Kombucha",
  "open water / bottle h2o": "Open Water",
  "chobani greek yogurt drink": "Chobani Greek Yogurt Drink",
  "smartwater": (r) => (/large/i.test(r.size) ? "Smartwater, large" : /small/i.test(r.size) ? "Smartwater, small" : undefined),
  "soda (unspecified)": "Soda (brand not recorded)",

  "barebells": "Barebells protein bar",
  "barebells protein bar": "Barebells protein bar",
  "quest bar": "Quest protein bar",
  "quest protein cookie": "Quest protein cookie",
  "quest frosted cookie": "Quest frosted cookie",
  "quest peanut butter cups": "Quest peanut butter cups",
  "think protein": "think! protein bar",
  "clif energy bar": "Clif Bar",
  "clif bar": "Clif Bar",
  "clif/luna energy bar": "Clif or Luna bar",
  "kind bar": "Kind bar",
  "powerbar": "PowerBar",
  "belvita": "belVita breakfast biscuits",
  "nature valley crunchy oats ’n honey granola bars": "Nature Valley Crunchy Oats ’n Honey",
  "nature valley almond butter biscuits": "Nature Valley Almond Butter Biscuits",
  "nature valley fruit & nut": "Nature Valley Fruit & Nut bar",
  "beef jerky": "Beef jerky",
  "chobani yogurt": "Chobani yogurt cup",

  "lance captain’s wafers grilled cheese sandwich crackers": "Lance Captain’s Wafers",
  "lance captain’s wafers": "Lance Captain’s Wafers",
  "lance nekot cookie sandwiches": "Lance Nekot cookies",
  "lance toast chee": "Lance Toast Chee crackers",
  "cheetos crunchy": "Cheetos",
  "cheetos": "Cheetos",
  "smartfood popcorn": "Smartfood popcorn",
  "popchips": "Popchips",
  "cheez-it original": "Cheez-It",
  "snyder’s of hanover mini pretzels": "Snyder’s mini pretzels",
  "garden veggie straws zesty ranch": "Garden Veggie Straws",
  "bugles nacho cheese": "Bugles",
  "goldfish cheddar": "Goldfish",
  "lay’s potato chips": "Lay’s potato chips",
  "lay’s barbecue": "Lay’s potato chips",
  "doritos": "Doritos",
  "fritos flavor twists": "Fritos Flavor Twists",
  "sun chips": "Sun Chips",
  "ruffles": "Ruffles",
  "takis": "Takis",
  "chex mix": "Chex Mix",
  "oreo": "Oreo",
  "roasted pistachio": "Roasted pistachios",
  "kar’s favorites mix with m&m’s": "Kar’s trail mix with M&M’s",
  "welch's fruit snacks": "Welch’s fruit snacks",
  "gushers": "Gushers",
  "snack factory pretzel crisps": "Snack Factory Pretzel Crisps",
  "snack factory chocolate covered pretzel crisps": "Snack Factory Chocolate Covered Pretzel Crisps",
  "boomchickapop popcorn": "BOOMCHICKAPOP popcorn",
  "lesserevil popcorn": "LesserEvil popcorn",
  "skinnypop popcorn": "SkinnyPop popcorn",
  "blue diamond almonds": "Blue Diamond almonds",
  "kitchen & love quinoa quick cup": "Kitchen & Love Quinoa Quick Cup",

  "jolly rancher sour gummies": "Jolly Rancher sour gummies",
  "albanese gummy worm": "Albanese gummy worms",
  "trolli sour": "Trolli sour gummies",
  "trolli sour brite crawlers": "Trolli sour gummies",
  "mike and ike": "Mike and Ike",
  "nerds sour gummy": "Nerds gummy clusters",
  "nerds juicy gummy clusters": "Nerds gummy clusters",
  "crunch bar": "Crunch bar",
  "sweetarts mini chewy": "SweeTarts Mini Chewy",
  "awake caffeine": "AWAKE caffeinated chocolate",
  "awake chocolate": "AWAKE caffeinated chocolate",
  "snickers": (r) => (/king/i.test(r.size) ? "Snickers King Size" : "Snickers"),
  "m&m’s peanut": "M&M’s",
  "m&m's": (r) => (/king/i.test(r.size) ? "M&M’s King Size" : "M&M’s"),
  "classic m&ms": "M&M’s",
  "kit kat": "Kit Kat",
  "reese’s peanut butter cups": "Reese’s Peanut Butter Cups",
  "reese’s sticks": "Reese’s Sticks",
  "reese's": (r) => (/white/i.test(r.flavor) ? "Reese’s White" : undefined),
  "reeses": "Reese’s (type not recorded)",
  "kinder bueno": "Kinder Bueno",
  "haribo goldbears": "Haribo Goldbears",
  "sour patch kids": "Sour Patch Kids",
  "skittles gummies": "Skittles Gummies",
  "skittles original": "Skittles",
  "sour skittles": "Skittles",
  "wild berry skittles": "Skittles",
  "starburst full size": "Starburst",
  "hersheys": "Hershey’s bar",
  "zagnut": "Zagnut",
  "twix": "Twix King Size",
  "butterfinger": "Butterfinger",
  "butterfingers": "Butterfinger",
  "mr. goodbar": "Mr. Goodbar King Size",
  "now & later": "Now & Later",
  "ghirardelli chocolate squares": "Ghirardelli chocolate squares",
  "lindt/ghirardelli chocolate (shelf tag)": "Lindt or Ghirardelli chocolate (shelf tag)",
  "king-size candy": "King-size candy bar (shelf tag)",
  "peg-bag candy (assorted)": "Peg-bag candy (assorted)",
  "ritter sport chocolate": "Ritter Sport chocolate",
  "chocolove chocolate": "Chocolove chocolate",
  "milka chocolate": "Milka chocolate",
  "barkthins snacking chocolate": "BarkTHINS snacking chocolate",

  "trident gum 14 piece": "Trident gum, 14 sticks",
  "trident white gum": "Trident White gum, 16 pieces",
  "trident vibes gum 40 piece bottle": "Trident Vibes gum, 40 pieces",
  "trident gum 28 pack": "Trident gum, 28-pack",
  "wrigley’s 5 gum": (r) => (/35|mega/i.test(r.size) ? "Wrigley’s 5 gum, mega pack" : /15/.test(r.size) ? "Wrigley’s 5 gum, 15 sticks" : undefined),
  "mentos gum": "Mentos gum",
  "altoids": "Altoids",
  "ice breakers mints": "Ice Breakers mints",
  "juicy fruit gum": "Juicy Fruit gum",
  "winterfresh gum": "Winterfresh gum",
  "big red gum": "Big Red gum",
  "wrigley’s doublemint gum": "Doublemint gum",
  "orbit gum 14 piece": "Orbit gum, 14 pieces",

  "chickpea stew": "Chickpea stew",

  // Added Nov 7 (second sheet): sizes in names, Bella Union drinks and snacks.
  "red bull 8.4oz": "Red Bull 8.4 oz",
  "red bull 12oz": "Red Bull 12 oz",
  "red bull 16oz": "Red Bull 16 oz",
  "red bull 20oz": "Red Bull 20 oz",
  "pepsi 20oz": "Pepsi",
  "mountain dew 20oz": "Mountain Dew",
  "sunkist 20z": "Sunkist",
  "schweppes ginger ale 20z": "Schweppes Ginger Ale",
  "orange juice 15oz": "Orange juice",
  "ocean spray juice cranberry 15oz": "Ocean Spray juice",
  "dole apple juice 15oz": "Dole apple juice",
  "coke": "Coca-Cola / Diet Coke",
  "diet coke": "Coca-Cola / Diet Coke",
  "coke zero": "Coca-Cola / Diet Coke",
  "diet dr. pepper": "Dr Pepper",
  "spire zero": "Sprite",
  "dasamo water": "Dasani water",
  "powderade": "Powerade",
  "boomchickapop popcorn (big)": "BOOMCHICKAPOP popcorn",
  "lesserevil popcorn (big)": "LesserEvil popcorn",
  "skinnypop popcorn (big)": "SkinnyPop popcorn",
  "cheese stick": "Cheese stick",
  "brownie brittle": "Brownie Brittle",
  "toblerone": "Toblerone",
  "jelly belly jelly beans": "Jelly Belly jelly beans",
  "lindt truffles (single)": "Lindt truffle (single)",
};

// Flavors that only appear in the sheet's item name ("Sour Skittles" → Sour).
// Combined with the Flavor column when both are present.
const FLAVOR_FROM_NAME = {
  "skittles original": "Original",
  "sour skittles": "Sour",
  "wild berry skittles": "Wild Berry",
  "m&m’s peanut": "Peanut",
  "cheetos crunchy": "Crunchy",
  "bugles nacho cheese": "Nacho Cheese",
  "goldfish cheddar": "Cheddar",
  "garden veggie straws zesty ranch": "Zesty Ranch",
  "lance captain’s wafers grilled cheese sandwich crackers": "Grilled Cheese",
  "lay’s barbecue": "Barbecue",
  "vitaminwater zero sugar ice": "Zero Sugar Ice",
  "coke": "Coca-Cola",
  "diet coke": "Diet Coke",
  "coke zero": "Coke Zero",
  "diet dr. pepper": "Diet Dr Pepper",
  "spire zero": "Sprite Zero",
};

// Name patterns checked before NAMES. `at` limits a rule to one place.
// Bella Union's $3.59 gummy bags are the big peg bags, so they're kept apart from
// the small vending packs of the same brand (a different size).
const PATTERNS = [
  { re: /^haribo (.+)$/i, at: "bellaUnion", name: "Haribo gummies, peg bag" },
  { re: /^trolli (.+)$/i, at: "bellaUnion", name: "Trolli gummies, peg bag" },
  { re: /^warheads (.+)$/i, at: "bellaUnion", name: "Warheads, peg bag" },
  { re: /^dirty deli style potato chips\s*[–-]\s*(.+)$/i, name: "Dirty potato chips" },
];

// Sizes that only appear in the sheet's item name ("Orange Juice 15oz", "(big)").
function sizeFromName(item) {
  const m = item.match(/(\d+(?:\.\d+)?)\s*o?z\b/i);
  if (m) return `${m[1]} oz`;
  if (/\(big\)/i.test(item)) return "Big";
  return null;
}

// Items that aren't in data/prices.js yet: category (+ aka / caffeine / protein).
const NEW_ITEMS = {
  "Orange juice":                    { category: "Drinks" },
  "Mtn Dew AMP":                     { category: "Drinks", energy: true, aka: ["amp"], caffeine: { mg: 142, size: "16 oz" } },
  "Smartwater, large":               { category: "Drinks", aka: ["smart water"] },
  "Smartwater, small":               { category: "Drinks", aka: ["smart water"] },
  "Soda (brand not recorded)":       { category: "Drinks" },
  "Chobani yogurt cup":              { category: "Snacks", highProtein: true, healthy: true, aka: ["greek yogurt"] },
  "Clif or Luna bar":                { category: "Snacks", aka: ["luna bar"] },
  "Snack Factory Pretzel Crisps":    { category: "Snacks", aka: ["pretzels"] },
  "Snack Factory Chocolate Covered Pretzel Crisps": { category: "Snacks", aka: ["pretzels"] },
  "BOOMCHICKAPOP popcorn":           { category: "Snacks", aka: ["angie's", "popcorn"] },
  "LesserEvil popcorn":              { category: "Snacks", aka: ["popcorn"] },
  "SkinnyPop popcorn":               { category: "Snacks", aka: ["popcorn"] },
  "Blue Diamond almonds":            { category: "Snacks", healthy: true, aka: ["nuts"] },
  "Kitchen & Love Quinoa Quick Cup": { category: "Meals", healthy: true, aka: ["quinoa"] },
  "Reese’s (type not recorded)":     { category: "Snacks", aka: ["reeses"] },
  "Skittles":                        { category: "Snacks" },
  "Starburst":                       { category: "Snacks" },
  "Hershey’s bar":                   { category: "Snacks", aka: ["hersheys"] },
  "Lindt or Ghirardelli chocolate (shelf tag)": { category: "Snacks", aka: ["lindt"] },
  "King-size candy bar (shelf tag)": { category: "Snacks" },
  "Peg-bag candy (assorted)":        { category: "Snacks" },
  "Ritter Sport chocolate":          { category: "Snacks" },
  "Chocolove chocolate":             { category: "Snacks" },
  "Milka chocolate":                 { category: "Snacks" },
  "BarkTHINS snacking chocolate":    { category: "Snacks" },
  "Trident gum, 28-pack":            { category: "Snacks" },
  "Orbit gum, 14 pieces":            { category: "Snacks" },
  "Haribo gummies, peg bag":         { category: "Snacks", aka: ["haribo", "gummy bears", "goldbears"] },
  "Trolli gummies, peg bag":         { category: "Snacks", aka: ["trolli", "sour crawlers"] },
  "Warheads, peg bag":               { category: "Snacks", aka: ["warheads", "sour candy"] },
  "Dirty potato chips":              { category: "Snacks", aka: ["dirty chips", "chips"] },
  "Cheese stick":                    { category: "Snacks", highProtein: true, healthy: true, aka: ["string cheese"] },
  "Brownie Brittle":                 { category: "Snacks" },
  "Toblerone":                       { category: "Snacks" },
  "Jelly Belly jelly beans":         { category: "Snacks", aka: ["jelly beans"] },
  "Lindt truffle (single)":          { category: "Snacks", aka: ["lindor"] },
};

// ── helpers ──
const key = (s) => s.trim().replace(/\s+/g, " ").replace(/['`]/g, (c) => c).toLowerCase();

function readSheet(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const sep = file.endsWith(".csv") ? "," : "\t";
  const rows = parseDelimited(text, sep).filter((r) => r.some((c) => c.trim()));
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const col = (name) => head.findIndex((h) => h.startsWith(name));
  const c = { item: col("item"), loc: col("location"), price: col("price"), date: col("date"), flavor: col("flavor"), size: col("size") };
  return rows.map((r, i) => ({
    line: i + 2,
    item: (r[c.item] || "").trim(),
    loc: (r[c.loc] || "").trim(),
    price: (r[c.price] || "").trim() === "" ? null : Number(String(r[c.price]).replace(/[$,]/g, "")),
    date: (r[c.date] || "").trim() || null,
    flavor: (r[c.flavor] || "").trim(),
    size: (r[c.size] || "").trim(),
  }));
}

// Handles quoted fields with commas/tabs/newlines.
function parseDelimited(text, sep) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Tidy sizes: "16 fl oz (473 mL)" → "16 oz", "Regular Size" → "Regular", etc.
function cleanSize(s) {
  if (!s) return null;
  if (/^28-pack/i.test(s)) return "28-pack";
  let t = s.replace(/\(.*?\)/g, "").replace(/fl oz/gi, "oz").replace(/\s+/g, " ").trim();
  t = t.replace(/^Regular Size$/i, "Regular").replace(/^Mega pack,\s*/i, "").replace(/^Bottle,\s*(\d+) pieces$/i, "$1-piece bottle");
  return t || null;
}

// Tidy flavors: "a; b" → "a, b", drop notes like "unclear", "unverified".
function cleanFlavors(s) {
  if (!s) return null;
  const parts = s.split(";").map((p) => p
    .replace(/\(.*?\)/g, "")
    .replace(/\s+at\s+[A-Z]?\d+[\w,\s]*$/i, "")
    .replace(/\s+/g, " ").trim())
    .filter((p) => p && !/unclear|unverified|unread|unreadable|relation|other (flavors|variants)/i.test(p))
    .map((p) => (p === p.toLowerCase() ? p[0].toUpperCase() + p.slice(1) : p));
  return parts.length ? [...new Set(parts)].join(", ") : null;
}

function loadCurrent() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(OUT, "utf8"), ctx);
  return ctx.window.PACE_DATA;
}

const js = (v) => JSON.stringify(v);
function objLiteral(o) {
  return "{ " + Object.entries(o).map(([k, v]) =>
    `${k}: ${v && typeof v === "object" && !Array.isArray(v) ? objLiteral(v) : js(v)}`).join(", ") + " }";
}

// Sheet rows left out on purpose (item name → why). Reported every run.
const SKIP = {
  "quiona cups": "duplicate of Kitchen & Love Quinoa Quick Cup",
};

// ── build ──
const current = loadCurrent();
const sheet = readSheet(SHEET);
const problems = [];
const skipped = [];
const built = new Map(); // item|loc|price -> entry

for (const r of sheet) {
  if (r.item && SKIP[key(r.item)]) { skipped.push(`Line ${r.line}: “${r.item}” (${SKIP[key(r.item)]})`); continue; }
  const locId = r.loc ? LOCATIONS[key(r.loc)] : null;
  if (r.loc && !locId) { problems.push(`Line ${r.line}: unknown location “${r.loc}” (${r.item}); left out`); continue; }
  if (!r.item) { problems.push(`Line ${r.line}: no item name (${r.loc || "no place"}${r.price != null ? `, $${r.price}` : ""}); left out`); continue; }
  const pat = PATTERNS.find((p) => p.re.test(r.item.trim()) && (!p.at || p.at === locId));
  const rule = pat ? pat.name : NAMES[key(r.item)];
  const name = typeof rule === "function" ? rule(r) : rule;
  if (!name) { problems.push(`Line ${r.line}: don’t know which item “${r.item}”${r.size ? ` (${r.size})` : ""} is; left out`); continue; }
  if (pat) r.patFlavor = r.item.trim().match(pat.re)[1].trim();
  if (r.price != null && !(r.price >= 0)) { problems.push(`Line ${r.line}: price “${r.price}” isn’t a number; left blank`); r.price = null; }
  const k = `${name}|${locId}|${r.price}`;
  const prev = built.get(k);
  const fromName = cleanFlavors(r.patFlavor || FLAVOR_FROM_NAME[key(r.item)] || "");
  const sheetFlavors = cleanFlavors(r.flavor);
  const flavors = fromName && sheetFlavors ? `${fromName} ${sheetFlavors}` : fromName || sheetFlavors;
  const size = cleanSize(r.size) || sizeFromName(r.item);
  if (prev) {
    // Same item, place and price: merge flavors, keep the latest date.
    if (flavors) prev.flavors = cleanFlavors([prev.flavors, flavors].filter(Boolean).join(";").replace(/, /g, ";"));
    if (r.date && (!prev.checked || r.date > prev.checked)) prev.checked = r.date;
    if (!prev.size && size) prev.size = size;
  } else {
    built.set(k, { item: name, loc: locId, price: r.price, size, flavors, checked: r.date, _line: r.line });
  }
}

// Same item and place but two different prices: keep both, flag it.
const byItemLoc = new Map();
for (const e of built.values()) {
  const k = `${e.item}|${e.loc}`;
  byItemLoc.set(k, [...(byItemLoc.get(k) || []), e]);
}
for (const [k, list] of byItemLoc) {
  const priced = list.filter((e) => e.price != null);
  if (priced.length > 1) problems.push(`${k.replace("|", " at ")}: ${priced.length} different prices (${priced.map((e) => "$" + e.price).join(", ")}); kept all`);
}

// Keep notes from the current data when the price didn't change.
const oldByKey = new Map(current.prices.map((p) => [`${p.item}|${p.loc}|${p.price}`, p]));
for (const e of built.values()) {
  const old = oldByKey.get(`${e.item}|${e.loc}|${e.price}`);
  if (old && old.note) e.note = old.note;
}

// Items: keep current metadata; add new ones; drop items with no rows.
const used = new Set([...built.values()].map((e) => e.item));
const items = {};
for (const [name, meta] of Object.entries(current.items)) if (used.has(name)) items[name] = meta;
for (const name of used) {
  if (items[name]) continue;
  if (!NEW_ITEMS[name]) { problems.push(`“${name}” has no category set up (NEW_ITEMS); used Snacks`); items[name] = { category: "Snacks" }; }
  else items[name] = NEW_ITEMS[name];
}

// ── write data/prices.js (locations block is kept exactly as it is) ──
const src = fs.readFileSync(OUT, "utf8");
const locStart = src.indexOf("  // lat/lng power");
const locEnd = src.indexOf("\n  },\n", src.indexOf("  locations: {")) + 6;
const locationsBlock = src.slice(locStart, locEnd);
const catOrder = ["Drinks", "Snacks", "Meals"];
const itemNames = Object.keys(items).sort((a, b) =>
  catOrder.indexOf(items[a].category) - catOrder.indexOf(items[b].category));
const entries = [...built.values()].sort((a, b) =>
  itemNames.indexOf(a.item) - itemNames.indexOf(b.item) || (a.price ?? 1e9) - (b.price ?? 1e9));

const priceLine = (e) => {
  const o = { item: e.item, loc: e.loc, price: e.price };
  if (e.size) o.size = e.size;
  if (e.flavors) o.flavors = e.flavors;
  if (e.checked) o.checked = e.checked;
  if (e.note) o.note = e.note;
  return "    " + objLiteral(o) + ",";
};

let out = `/*
  Devil Bites price data — student price checks, Oct–Nov 2026.

  BUILT FROM THE PRICE SHEET: edit "data/${path.basename(SHEET)}", then run
      node tools/build-prices.mjs
  Prices, places, sizes, flavors and dates come from the sheet.
  Item details (category, other spellings, caffeine, protein) are kept from this
  file, so you can edit those here; new items get theirs from NEW_ITEMS in the script.
*/
window.PACE_DATA = {
${locationsBlock}
  // category: Drinks · Snacks · Meals (Meals shows under All)
  // energy / highProtein / healthy: true puts the item under that Browse chip too
  // aka: other spellings people might search for
  // caffeine: typical mg for the size shown (max = top of a range when the flavor
  //   isn't known; estimate: true = worked out, not from the label)
  // protein: typical grams per item, from the package label
  items: {
`;
let lastCat = null;
for (const n of itemNames) {
  if (items[n].category !== lastCat) { out += `\n    // ${items[n].category}\n`; lastCat = items[n].category; }
  out += `    ${js(n)}: ${objLiteral(items[n])},\n`;
}
out += `  },\n\n  prices: [\n`;
lastCat = null;
for (const e of entries) {
  const cat = items[e.item].category;
  if (cat !== lastCat) { out += `\n    // ── ${cat} ──\n`; lastCat = cat; }
  out += priceLine(e) + "\n";
}
out += `  ],\n};\n`;

// ── report changes vs. the current data ──
const oldPrices = current.prices;
const newPrices = entries;
const k2 = (p) => `${p.item}|${p.loc}`;
const label = (p) => `${p.item} at ${p.loc ? current.locations[p.loc]?.name || p.loc : "(no place)"}`;
const money = (v) => (v == null ? "no price" : "$" + v.toFixed(2));
const report = { added: [], removed: [], priceChanged: [], placeRecorded: [], newItems: [], droppedItems: [] };

const oldMap = new Map(); for (const p of oldPrices) oldMap.set(k2(p), [...(oldMap.get(k2(p)) || []), p]);
const newMap = new Map(); for (const p of newPrices) newMap.set(k2(p), [...(newMap.get(k2(p)) || []), p]);
const matchedOld = new Set();

for (const [k, list] of newMap) {
  const olds = oldMap.get(k) || [];
  for (const n of list) {
    const same = olds.find((o) => o.price === n.price && !matchedOld.has(o));
    if (same) { matchedOld.add(same); continue; }
    const changed = olds.find((o) => !matchedOld.has(o) && !list.some((x) => x.price === o.price));
    if (changed) { matchedOld.add(changed); report.priceChanged.push(`${label(n)}: ${money(changed.price)} → ${money(n.price)}`); continue; }
    // Was it recorded before without a place?
    const placeless = (oldMap.get(`${n.item}|null`) || []).find((o) => !matchedOld.has(o) && o.price === n.price);
    if (placeless && n.loc) { matchedOld.add(placeless); report.placeRecorded.push(`${n.item}: now at ${current.locations[n.loc]?.name} (${money(n.price)})`); continue; }
    report.added.push(`${label(n)}: ${money(n.price)}`);
  }
}
for (const o of oldPrices) if (!matchedOld.has(o)) report.removed.push(`${label(o)}: ${money(o.price)}`);
for (const n of Object.keys(items)) if (!current.items[n]) report.newItems.push(n);
for (const n of Object.keys(current.items)) if (!items[n]) report.droppedItems.push(n);

fs.writeFileSync(OUT, out);
const section = (t, list) => list.length ? `\n${t} (${list.length})\n` + list.map((x) => "  - " + x).join("\n") : "";
console.log(`Read ${sheet.length} rows from ${path.relative(ROOT, SHEET)} → ${entries.length} prices, ${Object.keys(items).length} items.`);
console.log(
  section("Price changed", report.priceChanged) +
  section("Place recorded (was blank)", report.placeRecorded) +
  section("Added", report.added) +
  section("Removed (not in the sheet any more)", report.removed) +
  section("New items", report.newItems) +
  section("Items dropped (no rows left)", report.droppedItems) +
  section("Skipped on purpose", skipped) +
  section("Problems", problems));
