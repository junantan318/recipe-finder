import type { Tag, TagOrigin } from "./types.ts";

// Keyword rules for inferred tags. Each tag is labelled "inferred" in the UI so it is
// never mistaken for something the creator said.
// "any": matched against title and ingredients. "title": matched against the title only,
// because words like "cake" or "soup" in an ingredient line don't describe the dish.
const RULES: { tag: string; words: string[]; scope: "any" | "title" }[] = [
  { tag: "pasta", scope: "any", words: ["pasta", "spaghetti", "fettuccine", "fettuccini", "penne", "linguine", "linguini", "macaroni", "rigatoni", "lasagna", "lasagne", "tagliatelle", "orzo", "fusilli", "farfalle", "pappardelle", "bucatini", "orecchiette", "ravioli", "tortellini", "gnocchi", "alfredo", "carbonara", "bolognese"] },
  { tag: "noodles", scope: "any", words: ["noodle", "ramen", "udon", "soba", "vermicelli", "kway teow", "mee ", "pad thai", "lo mein", "chow mein", "laksa"] },
  { tag: "rice", scope: "any", words: ["rice", "risotto", "biryani", "paella", "nasi"] },
  { tag: "chicken", scope: "any", words: ["chicken"] },
  { tag: "beef", scope: "any", words: ["beef", "steak", "brisket", "mince beef", "ground beef"] },
  { tag: "pork", scope: "any", words: ["pork", "bacon", "pancetta", "ham", "prosciutto", "chorizo", "sausage"] },
  { tag: "lamb", scope: "any", words: ["lamb", "mutton"] },
  { tag: "seafood", scope: "any", words: ["shrimp", "prawn", "salmon", "tuna", "cod", "fish", "crab", "lobster", "mussel", "clam", "squid", "calamari", "scallop", "anchovy", "anchovies", "sardine", "seabass", "sea bass"] },
  { tag: "tofu", scope: "any", words: ["tofu", "tempeh"] },
  { tag: "eggs", scope: "title", words: ["egg", "omelette", "omelet", "frittata", "shakshuka"] },
  { tag: "soup", scope: "title", words: ["soup", "broth", "stew", "chowder", "bisque", "ramen", "laksa"] },
  { tag: "salad", scope: "title", words: ["salad", "slaw"] },
  { tag: "curry", scope: "title", words: ["curry", "masala", "korma", "vindaloo", "rendang", "tikka"] },
  { tag: "dessert", scope: "title", words: ["cake", "cookie", "brownie", "dessert", "pudding", "tart", "pie", "ice cream", "cheesecake", "mousse", "tiramisu", "cupcake", "muffin", "crumble", "pastry", "donut", "doughnut"] },
  { tag: "baking", scope: "title", words: ["bread", "focaccia", "sourdough", "loaf", "buns", "bake", "baked", "cake", "cookie", "muffin", "scone", "pastry"] },
  { tag: "breakfast", scope: "title", words: ["breakfast", "pancake", "waffle", "granola", "oatmeal", "porridge", "french toast", "overnight oats"] },
  { tag: "stir-fry", scope: "title", words: ["stir fry", "stir-fry", "stirfry", "wok"] },
  { tag: "sandwich", scope: "title", words: ["sandwich", "burger", "hamburger", "cheeseburger", "wrap", "toastie", "panini", "taco", "burrito", "quesadilla"] },
];

// Ingredient lines about stock or broth shouldn't make a dish "chicken" or "beef".
const SKIP_FOR_PROTEIN = /\b(stock|broth|bouillon|cube|powder|seasoning|fish sauce|oyster sauce)\b/i;
const PROTEINS = new Set(["chicken", "beef", "pork", "lamb", "seafood"]);

function containsWord(haystack: string, word: string): boolean {
  if (word.endsWith(" ")) return haystack.includes(word);
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}(?:s|es)?\\b`, "i").test(haystack);
}

export function inferTags(title: string, ingredients: string[]): string[] {
  const t = ` ${title.toLowerCase()} `;
  const tags: string[] = [];
  for (const rule of RULES) {
    const lines = rule.scope === "any"
      ? ingredients.filter((l) => !(PROTEINS.has(rule.tag) && SKIP_FOR_PROTEIN.test(l)))
      : [];
    const hit = rule.words.some(
      (w) => containsWord(t, w) || lines.some((l) => containsWord(` ${l.toLowerCase()} `, w)),
    );
    if (hit) tags.push(rule.tag);
  }
  return tags;
}

// Hashtags that say nothing about the dish.
const GENERIC = new Set([
  "recipe", "recipes", "food", "foodie", "foodies", "foodporn", "foodblogger", "foodstagram",
  "instafood", "reels", "reel", "reelsinstagram", "instagram", "explore", "explorepage", "fyp",
  "foryou", "foryoupage", "viral", "trending", "shorts", "youtubeshorts", "short", "cooking",
  "cook", "homecooking", "homemade", "easyrecipe", "easyrecipes", "yummy", "delicious", "tasty",
  "dinner", "lunch", "dinnerideas", "foodlover", "chef", "kitchen", "foodshorts", "shortsfeed", "recipeshorts", "eat", "eats", "love", "instagood",
]);

export function normaliseTag(name: string): string {
  return name.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ").slice(0, 32);
}

export function sourceTags(names: string[], limit = 8): string[] {
  const out: string[] = [];
  for (const raw of names) {
    const n = normaliseTag(raw);
    if (!n || GENERIC.has(n) || n.length < 3 || out.includes(n)) continue;
    out.push(n);
    if (out.length >= limit) break;
  }
  return out;
}

// Merges tag lists, keeping the first origin seen for each name (source > manual > inferred
// depending on call order).
export function mergeTags(...groups: { names: string[]; origin: TagOrigin }[]): Tag[] {
  const out: Tag[] = [];
  for (const g of groups) {
    for (const raw of g.names) {
      const name = normaliseTag(raw);
      if (name && !out.some((t) => t.name === name)) out.push({ name, origin: g.origin });
    }
  }
  return out;
}
