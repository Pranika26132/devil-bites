// Rules that generate search tags for every item (used by tools/build-tags.mjs).
//
// To fix one item's tags, prefer data/tag-edits.csv (no code). Edit this file to
// change how a whole kind of item is tagged.

// ── Brands ── [brand shown in the tag list, words that identify it in the item name, extra tags]
// First match wins, so more specific names come first.
export const BRANDS = [
  ["Coca-Cola", ["coca-cola", "soda cans"]],
  ["Sprite", ["sprite"]], ["Dr Pepper", ["dr pepper"]], ["Fanta", ["fanta"]],
  ["Minute Maid", ["minute maid"]], ["Poppi", ["poppi"]], ["Pepsi", ["pepsi"]],
  ["Mtn Dew", ["mtn dew", "mountain dew"], ["mountain dew"]],
  ["Sunkist", ["sunkist"]], ["Schweppes", ["schweppes"]], ["Ocean Spray", ["ocean spray"]],
  ["Dole", ["dole"]], ["Starbucks", ["starbucks"]], ["Lipton", ["lipton"]], ["Naked", ["naked juice"]],
  ["Gatorade", ["gatorade"]], ["LIFEWTR", ["lifewtr"]], ["Propel", ["propel"]],
  ["Vitaminwater", ["vitaminwater"]], ["Gold Peak", ["gold peak"]], ["Topo Chico", ["topo chico"]],
  ["BodyArmor", ["bodyarmor"]], ["Powerade", ["powerade"]], ["Dasani", ["dasani"]],
  ["Aquafina", ["aquafina"]], ["OLIPOP", ["olipop"]], ["Spindrift", ["spindrift"]],
  ["Open Water", ["open water"]], ["Smartwater", ["smartwater"]], ["Bubbl’r", ["bubbl’r"]],
  ["Red Bull", ["red bull"]], ["Rockstar", ["rockstar"]], ["Celsius", ["celsius"]],
  ["Alani Nu", ["alani"]], ["Storm", ["storm energy"]], ["C4", ["c4 energy"]], ["Monster", ["monster"]],
  ["Muscle Milk", ["muscle milk"]], ["Spylt", ["spylt"]], ["Slate", ["slate milk"]], ["Chobani", ["chobani"]],
  ["Barebells", ["barebells"]], ["Oikos", ["oikos"]], ["Quest", ["quest"]], ["think!", ["think!"]],
  ["PowerBar", ["powerbar"]], ["Clif", ["clif"]], ["Kind", ["kind bar"]], ["belVita", ["belvita"]],
  ["Nature Valley", ["nature valley"]], ["Lance", ["lance"]], ["Cheetos", ["cheetos"]],
  ["Smartfood", ["smartfood"]], ["Popchips", ["popchips"]], ["Cheez-It", ["cheez-it"]],
  ["Snyder’s", ["snyder’s"]], ["Sensible Portions", ["garden veggie straws"]], ["Bugles", ["bugles"]],
  ["Goldfish", ["goldfish"], ["pepperidge farm"]], ["Lay’s", ["lay’s"]], ["Doritos", ["doritos"]],
  ["Fritos", ["fritos"]], ["SunChips", ["sun chips"]], ["Ruffles", ["ruffles"]], ["Takis", ["takis"]],
  ["Chex Mix", ["chex mix"]], ["Kar’s", ["kar’s"]], ["Snack Factory", ["snack factory"]],
  ["BOOMCHICKAPOP", ["boomchickapop"], ["angie’s"]], ["LesserEvil", ["lesserevil"]],
  ["SkinnyPop", ["skinnypop"]], ["Blue Diamond", ["blue diamond"]], ["Dirty", ["dirty potato chips"]],
  ["Oreo", ["oreo"]], ["Welch’s", ["welch’s"]], ["Gushers", ["gushers"]],
  ["Jolly Rancher", ["jolly rancher"]], ["Albanese", ["albanese"]], ["Trolli", ["trolli"]],
  ["Mike and Ike", ["mike and ike"]], ["Nerds", ["nerds"]], ["Crunch", ["crunch bar"]],
  ["SweeTarts", ["sweetarts"]], ["AWAKE", ["awake"]], ["Snickers", ["snickers"]],
  ["M&M’s", ["m&m’s"]], ["Kit Kat", ["kit kat"]], ["Reese’s", ["reese’s"]], ["Kinder", ["kinder"]],
  ["Haribo", ["haribo"]], ["Sour Patch Kids", ["sour patch"]], ["Skittles", ["skittles"]],
  ["Zagnut", ["zagnut"]], ["Twix", ["twix"]], ["Butterfinger", ["butterfinger"]],
  ["Hershey’s", ["mr. goodbar", "hershey’s"]], ["Now & Later", ["now & later"]],
  ["Lindt", ["lindt truffle"]], ["Ghirardelli", ["ghirardelli chocolate squares"]],
  ["Trident", ["trident"]], ["Wrigley’s", ["wrigley’s", "juicy fruit", "winterfresh", "big red", "doublemint", "orbit"]],
  ["Mentos", ["mentos"]], ["Altoids", ["altoids"]], ["Ice Breakers", ["ice breakers"]],
  ["Starburst", ["starburst"]], ["Ritter Sport", ["ritter sport"]], ["Chocolove", ["chocolove"]],
  ["Milka", ["milka"]], ["BarkTHINS", ["barkthins"]], ["Warheads", ["warheads"]],
  ["Brownie Brittle", ["brownie brittle"]], ["Toblerone", ["toblerone"]], ["Jelly Belly", ["jelly belly"]],
  ["Kitchen & Love", ["kitchen & love"]],
];

// ── Product-type tags ── [regex on the lowercase item name, tags]. Every matching rule adds its tags.
const CANDY = ["candy", "sweets"];
const CHOC_BAR = ["chocolate", "candy bar", ...CANDY];
const GUMMY = ["gummies", ...CANDY];
const CHIPS = ["chips", "snack", "salty"];
const GUM = ["gum", "chewing gum"];
const MINTS = ["mints", "breath mints", ...CANDY];

export const RULES = [
  // Drinks
  [/coca-cola|^sprite$|dr pepper|^fanta$|^pepsi$|mountain dew|sunkist|ginger ale|soda cans/, ["soda", "pop"]],
  [/coca-cola|^pepsi$|dr pepper/, ["cola"]],
  [/poppi|olipop/, ["soda", "prebiotic soda"]],
  [/juice|naked/, ["juice"]],
  [/naked/, ["smoothie"]],
  [/lipton|gold peak/, ["iced tea", "tea"]],
  [/kombucha/, ["kombucha", "tea", "fermented"]],
  [/frappuccino/, ["coffee", "coffee drink", "iced coffee"]],
  [/doubleshot/, ["coffee", "coffee drink"]],
  [/gatorade|powerade|bodyarmor/, ["sports drink", "electrolytes"]],
  [/dasani|aquafina|smartwater|lifewtr|open water|bottled water/, ["water", "bottled water"]],
  [/topo chico/, ["water", "sparkling water", "mineral water", "seltzer"]],
  [/spindrift|bubbl’r/, ["water", "sparkling water", "seltzer"]],
  [/propel|vitaminwater/, ["water", "flavored water"]],
  [/propel/, ["electrolytes"]],
  [/vitaminwater/, ["vitamins"]],
  [/muscle milk/, ["protein shake", "protein drink", "milk", "dairy"]],
  [/spylt|slate milk/, ["protein drink", "milk", "dairy"]],
  [/slate milk/, ["chocolate milk"]],
  [/chobani greek yogurt drink/, ["yogurt", "yogurt drink", "protein drink", "dairy"]],

  // Bars, yogurt, protein snacks
  [/barebells|quest protein bar|think! protein bar|powerbar/, ["protein bar", "snack bar"]],
  [/barebells/, ["chocolate"]],
  [/clif|kind bar|nature valley.*(oats|fruit & nut)/, ["snack bar", "granola bar"]],
  [/kind bar|fruit & nut/, ["nuts"]],
  [/oats ’n honey/, ["oats", "honey"]],
  [/almond butter biscuits/, ["biscuits", "almond butter"]],
  [/belvita/, ["biscuits", "breakfast"]],
  [/quest protein cookie|quest frosted cookie/, ["cookies", "protein cookie", "sweets"]],
  [/quest peanut butter cups/, ["peanut butter cups", "peanut butter", "chocolate", ...CANDY]],
  [/oikos|chobani yogurt cup/, ["yogurt", "greek yogurt", "dairy"]],
  [/cheese stick/, ["cheese", "string cheese", "dairy"]],
  [/beef jerky/, ["jerky", "meat"]],

  // Salty snacks
  [/captain’s wafers|toast chee/, ["crackers", "sandwich crackers", "snack"]],
  [/captain’s wafers|cheez-it|goldfish|cheetos/, ["cheese"]],
  [/toast chee/, ["peanut butter"]],
  [/cheez-it|goldfish/, ["crackers", "snack"]],
  [/cheetos/, ["cheese puffs", ...CHIPS]],
  [/popchips|lay’s|ruffles|dirty potato chips/, ["potato chips", ...CHIPS]],
  [/doritos|takis/, ["tortilla chips", ...CHIPS]],
  [/takis/, ["spicy"]],
  [/fritos|bugles/, ["corn chips", ...CHIPS]],
  [/sun chips/, ["whole grain", ...CHIPS]],
  [/veggie straws/, ["veggie straws", ...CHIPS]],
  [/popcorn/, ["popcorn", "snack"]],
  [/pretzel/, ["pretzels", "snack"]],
  [/snyder’s|^snack factory pretzel crisps$/, ["salty"]],
  [/pistachios/, ["nuts", "pistachios", "snack"]],
  [/blue diamond/, ["nuts", "almonds", "snack"]],
  [/chex mix/, ["snack mix", "snack", "salty"]],
  [/trail mix/, ["trail mix", "snack mix", "nuts", "chocolate", "m&m’s", "snack"]],

  // Cookies and sweets
  [/^oreo$/, ["cookies", "chocolate", "sweets"]],
  [/nekot/, ["cookies", "peanut butter", "sandwich cookies", "sweets"]],
  [/brownie brittle/, ["brownie", "chocolate", "sweets"]],
  [/chocolate covered pretzel/, ["chocolate", ...CANDY]],
  [/fruit snacks|gushers/, ["fruit snacks", ...CANDY]],
  [/gumm|haribo|trolli|sour patch|warheads/, GUMMY],
  [/gummy worms|trolli/, ["gummy worms"]],
  [/haribo/, ["gummy bears"]],
  [/sour|trolli|warheads|sweetarts/, ["sour candy"]],
  [/mike and ike|sweetarts|now & later|starburst|skittles(?! gummies)/, ["chewy candy", ...CANDY]],
  [/mike and ike|starburst|skittles/, ["fruity"]],
  [/jelly belly/, ["jelly beans", ...CANDY]],
  [/peg-bag candy/, CANDY],
  [/snickers/, ["peanuts", "caramel", ...CHOC_BAR]],
  [/twix/, ["caramel", "cookie", ...CHOC_BAR]],
  [/kit kat/, ["wafer", ...CHOC_BAR]],
  [/crunch bar/, ["crisped rice", ...CHOC_BAR]],
  [/m&m’s/, ["chocolate candy", "chocolate", ...CANDY]],
  [/reese’s/, ["peanut butter", "chocolate", ...CANDY]],
  [/reese’s (peanut butter cups|white)/, ["peanut butter cups"]],
  [/reese’s white/, ["white chocolate"]],
  [/reese’s sticks/, ["wafer", "candy bar"]],
  [/kinder bueno/, ["wafer", "hazelnut", ...CHOC_BAR]],
  [/butterfinger/, ["peanut butter", ...CHOC_BAR]],
  [/goodbar/, ["peanuts", ...CHOC_BAR]],
  [/hershey’s bar|king-size candy bar/, CHOC_BAR],
  [/zagnut/, ["peanut butter", "coconut", "candy bar", ...CANDY]],
  [/awake/, ["energy", ...CHOC_BAR]],
  [/toblerone/, ["nougat", "almonds", "honey", ...CHOC_BAR]],
  [/lindt truffle/, ["truffle", "chocolate", ...CANDY]],
  [/ghirardelli|lindt or ghirardelli|ritter sport|chocolove|milka/, ["chocolate", "chocolate bar", ...CANDY]],
  [/barkthins/, ["chocolate", "dark chocolate", "almonds", ...CANDY]],
  [/gum\b|gum,/, GUM],
  [/altoids|ice breakers/, MINTS],

  // Meals
  [/quinoa/, ["quinoa", "meal", "grain bowl"]],
];

// ── Low calorie ── clearly zero or near-zero calorie by product type.
// "all": the whole item. "variants": only the diet / zero versions count, so
// Browse shows just the spots where one was recorded (e.g. Diet Coke, not Coke).
export const LOW_CAL = [
  [/dasani|aquafina|smartwater|lifewtr|topo chico|bubbl’r|spindrift|open water|bottled water/, "all"],
  [/^propel$|powerade zero|celsius|alani|c4 energy|monster|storm energy/, "all"],
  [/coca-cola|^pepsi$|^sprite$|mountain dew|dr pepper|vitaminwater/, "variants"],
  [/gum\b|gum,|altoids|ice breakers/, "all"],
];
// Search words for these items ("low cal", "zero sugar", "diet", "light"…)
export const LOW_CAL_TAGS = ["low calorie", "low cal", "zero sugar", "diet", "light"];
// Which flavors count as the low-calorie version of a "variants" item
export const LOW_CAL_FLAVOR = /\bdiet\b|\bzero\b|sugar ?free/i;

// ── Word groups ── searching any word finds items tagged with the others too.
// Words are compared in singular form ("candies" → "candy").
export const SYNONYMS = [
  ["candy", "sweet"],
  ["energy", "caffeine", "caffeinated"],
  ["gum", "mint"],
  ["drink", "beverage"],
  ["soda", "pop"],
  ["yogurt", "yoghurt"],
  ["seltzer", "sparkling"],
];
