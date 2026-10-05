import { load, type CheerioAPI } from "cheerio";

// Recipe data read from a web page. Fields are empty when the page doesn't provide them.
export interface PageRecipe {
  title: string;
  creator: string;
  image: string | null;
  ingredients: string[];
  steps: string[];
  keywords: string[];
  description: string;
  structured: "json-ld" | "microdata" | null;
}

type Json = Record<string, unknown>;

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function plain(text: unknown): string {
  if (typeof text !== "string") return "";
  // Decode entities and drop any HTML tags inside the value.
  return load(`<p>${text}</p>`)("p").text().replace(/\s+/g, " ").trim();
}

function hasType(node: Json, type: string): boolean {
  return asArray(node["@type"] as string | string[]).some(
    (t) => typeof t === "string" && t.toLowerCase() === type.toLowerCase(),
  );
}

// Walks parsed JSON-LD (arrays, @graph, nesting) looking for a Recipe node.
function findRecipe(node: unknown, depth = 0): Json | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findRecipe(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  const obj = node as Json;
  if (hasType(obj, "Recipe")) return obj;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    const r = findRecipe(obj[key], depth + 1);
    if (r) return r;
  }
  return null;
}

function imageUrl(v: unknown): string | null {
  for (const item of asArray(v as unknown)) {
    if (typeof item === "string" && item.startsWith("http")) return item;
    if (item && typeof item === "object") {
      const url = (item as Json).url ?? (item as Json).contentUrl;
      if (typeof url === "string" && url.startsWith("http")) return url;
    }
  }
  return null;
}

function personName(v: unknown): string {
  const names = asArray(v as unknown)
    .map((p) => (typeof p === "string" ? p : p && typeof p === "object" ? (p as Json).name : ""))
    .filter((n): n is string => typeof n === "string" && n.trim() !== "");
  return names.map(plain).join(", ");
}

// recipeInstructions can be a string, a list of strings, HowToSteps, or HowToSections.
function instructionLines(v: unknown, out: string[] = []): string[] {
  for (const item of asArray(v as unknown)) {
    if (typeof item === "string") {
      const text = plain(item);
      // A single string often holds every step separated by newlines or numbers.
      const parts = item.includes("\n") ? item.split(/\n+/).map(plain) : [text];
      out.push(...parts.filter(Boolean));
    } else if (item && typeof item === "object") {
      const obj = item as Json;
      if (hasType(obj, "HowToSection")) {
        const name = plain(obj.name);
        if (name) out.push(name.endsWith(":") ? name : `${name}:`);
        instructionLines(obj.itemListElement, out);
      } else if (obj.itemListElement) {
        instructionLines(obj.itemListElement, out);
      } else {
        const text = plain(obj.text) || plain(obj.name);
        if (text) out.push(text);
      }
    }
  }
  return out;
}

function keywordList(...values: unknown[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    for (const item of asArray(v as unknown)) {
      if (typeof item !== "string") continue;
      out.push(...item.split(",").map((s) => plain(s)).filter(Boolean));
    }
  }
  return out;
}

function fromJsonLd($: CheerioAPI): PageRecipe | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    const raw = $(el).contents().text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        // Some sites put raw newlines or control characters inside strings.
        parsed = JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " "));
      } catch {
        continue;
      }
    }
    const recipe = findRecipe(parsed);
    if (!recipe) continue;
    return {
      title: plain(recipe.name),
      creator: personName(recipe.author),
      image: imageUrl(recipe.image),
      ingredients: asArray(recipe.recipeIngredient ?? recipe.ingredients).map(plain).filter(Boolean),
      steps: instructionLines(recipe.recipeInstructions),
      keywords: keywordList(recipe.recipeCategory, recipe.recipeCuisine, recipe.keywords),
      description: plain(recipe.description),
      structured: "json-ld",
    };
  }
  return null;
}

function fromMicrodata($: CheerioAPI): PageRecipe | null {
  const scope = $('[itemtype*="schema.org/Recipe"]').first();
  if (!scope.length) return null;
  const text = (sel: string) =>
    scope.find(sel).toArray().map((el) => $(el).text().replace(/\s+/g, " ").trim()).filter(Boolean);
  const ingredients = text('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
  const steps = text('[itemprop="recipeInstructions"]');
  if (!ingredients.length && !steps.length) return null;
  return {
    title: text('[itemprop="name"]')[0] ?? "",
    creator: text('[itemprop="author"]')[0] ?? "",
    image: scope.find('[itemprop="image"]').attr("src") ?? scope.find('[itemprop="image"]').attr("content") ?? null,
    ingredients,
    steps,
    keywords: [],
    description: "",
    structured: "microdata",
  };
}

export interface PageMeta {
  title: string;
  image: string | null;
  description: string;
  siteName: string;
  author: string;
}

export function readMeta($: CheerioAPI): PageMeta {
  const meta = (names: string[]) => {
    for (const n of names) {
      const v = $(`meta[property="${n}"]`).attr("content") ?? $(`meta[name="${n}"]`).attr("content");
      if (v && v.trim()) return plain(v);
    }
    return "";
  };
  const image = meta(["og:image", "og:image:url", "twitter:image"]);
  return {
    title: meta(["og:title", "twitter:title"]) || plain($("title").first().text()),
    image: image.startsWith("http") ? image : null,
    description: meta(["og:description", "description", "twitter:description"]),
    siteName: meta(["og:site_name", "application-name"]),
    author: meta(["author", "article:author"]),
  };
}

export function parseRecipePage(html: string): { recipe: PageRecipe | null; meta: PageMeta } {
  const $ = load(html);
  return { recipe: fromJsonLd($) ?? fromMicrodata($), meta: readMeta($) };
}
