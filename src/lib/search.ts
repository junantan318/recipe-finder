import type { Recipe } from "./types.ts";

function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Very small stemmer so "tomatoes" finds "tomato" and "noodles" finds "noodle".
function stem(token: string): string {
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenize(query: string): string[] {
  return fold(query).split(/[\s,]+/).filter(Boolean).map(stem);
}

// Every word in the query must match somewhere (title, creator, ingredients, tags, notes).
// Returns 0 for no match, otherwise a score where title hits rank highest.
export function scoreRecipe(recipe: Recipe, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const title = fold(recipe.title);
  const tags = fold(recipe.tags.map((t) => t.name).join(" | "));
  const ingredients = fold(recipe.ingredients.join(" | "));
  const other = fold(`${recipe.creator} | ${recipe.notes}`);
  let score = 0;
  for (const token of tokens) {
    let s = 0;
    if (title.includes(token)) s += 10;
    if (tags.includes(token)) s += 6;
    if (ingredients.includes(token)) s += 4;
    if (other.includes(token)) s += 2;
    if (s === 0) return 0;
    score += s;
  }
  return score;
}

export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return recipes;
  return recipes
    .map((r) => ({ r, s: scoreRecipe(r, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.r.importedAt.localeCompare(a.r.importedAt))
    .map((x) => x.r);
}
