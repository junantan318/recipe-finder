import { test } from "node:test";
import assert from "node:assert/strict";
import { detectSource } from "../src/lib/url.ts";
import { parseRecipeText, firstLineTitle, stripHashtags, splitQuantity, countItems } from "../src/lib/text-parse.ts";
import { inferTags, sourceTags } from "../src/lib/tags.ts";
import { searchRecipes } from "../src/lib/search.ts";
import { parseRecipePage } from "../src/lib/server/html.ts";
import { vttToText } from "../src/lib/server/ytdlp.ts";
import type { Recipe } from "../src/lib/types.ts";

test("detectSource: YouTube variants share one key", () => {
  const keys = [
    "https://www.youtube.com/watch?v=F7CU0qBdj04&t=30s",
    "https://youtu.be/F7CU0qBdj04?si=abc",
    "youtube.com/shorts/F7CU0qBdj04",
    "https://m.youtube.com/watch?v=F7CU0qBdj04&pp=xyz",
  ].map((u) => detectSource(u)?.key);
  assert.deepEqual(new Set(keys), new Set(["youtube:F7CU0qBdj04"]));
  assert.equal(detectSource("https://youtu.be/F7CU0qBdj04")?.canonicalUrl, "https://www.youtube.com/watch?v=F7CU0qBdj04");
});

test("detectSource: Instagram post, reel and reels share one key", () => {
  for (const u of [
    "https://www.instagram.com/reel/C8CaBfWs1mr/?igsh=abc",
    "https://instagram.com/reels/C8CaBfWs1mr",
    "https://www.instagram.com/someone/reel/C8CaBfWs1mr/",
  ]) {
    assert.equal(detectSource(u)?.key, "instagram:C8CaBfWs1mr", u);
    assert.equal(detectSource(u)?.platform, "instagram");
  }
});

test("detectSource: web links ignore tracking params, fragments, www and trailing slash", () => {
  const a = detectSource("https://www.recipetineats.com/one-pot-chicken-alfredo-pasta/?utm_source=ig#recipe");
  const b = detectSource("recipetineats.com/one-pot-chicken-alfredo-pasta");
  assert.equal(a?.key, b?.key);
  assert.equal(a?.platform, "web");
  assert.equal(detectSource("not a link"), null);
  assert.equal(detectSource("javascript:alert(1)"), null);
});

const CAPTION = `Creamy chicken Alfredo in 20 minutes 🍝

Ingredients:
• 250g fettuccine
• 2 chicken breasts
- 1 cup heavy cream
- 1/2 cup grated parmesan
Salt and pepper

Method:
1. Cook the pasta.
2. Sear the chicken, then slice.
3) Simmer cream, stir in parmesan and toss everything together.

Save this for later! #pasta #chickenalfredo #reels`;

test("parseRecipeText: reads sections under headings, word for word", () => {
  const p = parseRecipeText(CAPTION);
  assert.equal(p.ingredientsFound, "heading");
  assert.equal(p.stepsFound, "heading");
  assert.deepEqual(p.ingredients, ["250g fettuccine", "2 chicken breasts", "1 cup heavy cream", "1/2 cup grated parmesan", "Salt and pepper"]);
  assert.deepEqual(p.steps, ["Cook the pasta.", "Sear the chicken, then slice.", "Simmer cream, stir in parmesan and toss everything together."]);
  assert.deepEqual(p.hashtags, ["pasta", "chickenalfredo", "reels"]);
});

test("parseRecipeText: nothing recognisable means empty lists, not guesses", () => {
  const p = parseRecipeText("When the game you love, loves you back #priceless");
  assert.deepEqual(p.ingredients, []);
  assert.deepEqual(p.steps, []);
  assert.equal(p.ingredientsFound, null);
});

test("parseRecipeText: quantity-shaped lines without a heading are flagged as pattern", () => {
  const p = parseRecipeText(`To Make Cooked Pasta\n\nPenne Pasta - 2 Cups\nGarlic - 5 Cloves\nOnion - 1 No.\nCheese Slice - 4 Nos`);
  assert.equal(p.ingredientsFound, "pattern");
  assert.deepEqual(p.ingredients, ["Penne Pasta - 2 Cups", "Garlic - 5 Cloves", "Onion - 1 No.", "Cheese Slice - 4 Nos"]);
});

test("parseRecipeText: inline ingredient list and prose after the list", () => {
  const p = parseRecipeText("Ingredients: 200g spaghetti, 3 cloves garlic, chilli flakes\n\nThis is honestly the best thing I have cooked all year and you should try it too.");
  assert.deepEqual(p.ingredients, ["200g spaghetti", "3 cloves garlic", "chilli flakes"]);
});

test("hashtags inside URLs are ignored", () => {
  assert.deepEqual(parseRecipeText("see https://example.com/?q=x#internal=1 #pasta").hashtags, ["pasta"]);
});

test("titles: hashtags stripped, caption first line used", () => {
  assert.equal(stripHashtags("THE Killer Pasta! 🔥 #shorts #recipe #pasta"), "THE Killer Pasta! 🔥");
  assert.equal(firstLineTitle(CAPTION), "Creamy chicken Alfredo in 20 minutes 🍝");
  assert.deepEqual(splitQuantity("250g fettuccine"), { qty: "250g", rest: "fettuccine" });
  assert.deepEqual(splitQuantity("Salt and pepper"), { qty: "", rest: "Salt and pepper" });
});

test("inferTags: chicken Alfredo is pasta and chicken; stock doesn't count as chicken", () => {
  assert.deepEqual(inferTags("Chicken Alfredo", ["250g fettuccine", "1 cup cream"]), ["pasta", "chicken"]);
  assert.deepEqual(inferTags("Vegetable soup", ["1 l chicken stock", "2 carrots"]), ["soup"]);
  assert.deepEqual(inferTags("Hamburger", []), ["sandwich"]);
  assert.deepEqual(sourceTags(["#Pasta", "reels", "fyp", "ChickenAlfredo"]), ["pasta", "chickenalfredo"]);
});

function recipe(id: number, title: string, ingredients: string[], tags: string[], notes = ""): Recipe {
  return {
    id, title, ingredients, notes, steps: [], creator: "", platform: "web", url: null, sourceKey: null,
    thumbnailUrl: null, hasThumbnail: false, tags: tags.map((name) => ({ name, origin: "source" as const })),
    sourceTexts: [], fieldSources: {}, uncertain: [], warnings: [], starred: false,
    importedAt: `2026-10-0${id}T00:00:00Z`, updatedAt: "",
  };
}

test("search: title, ingredient, tag and notes; plurals; every word must match", () => {
  const all = [
    recipe(1, "Chicken Alfredo", ["250g fettuccine", "2 chicken breasts"], ["pasta", "chicken"]),
    recipe(2, "Tomato soup", ["6 tomatoes", "1 onion"], ["soup"], "Mum's favourite"),
    recipe(3, "Beef noodles", ["200g rice noodles"], ["noodles", "beef"]),
  ];
  const ids = (q: string) => searchRecipes(all, q).map((r) => r.id);
  assert.deepEqual(ids("chicken"), [1]);
  assert.deepEqual(ids("Alfredo"), [1]);
  assert.deepEqual(ids("pasta"), [1]);
  assert.deepEqual(ids("tomatoes"), [2]);
  assert.deepEqual(ids("noodle"), [3]);
  assert.deepEqual(ids("mum"), [2]);
  assert.deepEqual(ids("chicken soup"), []);
  assert.deepEqual(ids(""), [1, 2, 3]);
});

test("parseRecipePage: JSON-LD in @graph with HowToSections", () => {
  const html = `<html><head><meta property="og:title" content="OG title"><script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":["Recipe","NewsArticle"],"name":"Lasagna &amp; more",
    "author":[{"@type":"Person","name":"Jo"}],"image":{"@type":"ImageObject","url":"https://img/x.jpg"},
    "recipeIngredient":["1 lb sausage","<b>2</b> cans tomato"],"keywords":"italian, baked",
    "recipeInstructions":[{"@type":"HowToSection","name":"Sauce","itemListElement":[{"@type":"HowToStep","text":"Brown the sausage."}]},{"@type":"HowToStep","text":"Bake."}]}]}
  </script></head></html>`;
  const { recipe: r, meta } = parseRecipePage(html);
  assert.equal(r?.title, "Lasagna & more");
  assert.equal(r?.creator, "Jo");
  assert.equal(r?.image, "https://img/x.jpg");
  assert.deepEqual(r?.ingredients, ["1 lb sausage", "2 cans tomato"]);
  assert.deepEqual(r?.steps, ["Sauce:", "Brown the sausage.", "Bake."]);
  assert.deepEqual(r?.keywords, ["italian", "baked"]);
  assert.equal(meta.title, "OG title");
});

test("vttToText: removes timing and rolling duplicates", () => {
  const vtt = `WEBVTT\nKind: captions\nLanguage: en\n\n00:00:00.000 --> 00:00:01.910 align:start\nhey<00:00:00.420><c> I'm</c> John\n\n00:00:01.910 --> 00:00:03.000\nhey I'm John\ntoday we cook\n\n00:00:03.000 --> 00:00:04.000\ntoday we cook\npasta.`;
  assert.equal(vttToText(vtt), "hey I'm John today we cook pasta.");
});

test("splitQuantity: mixed fractions and ranges", () => {
  assert.deepEqual(splitQuantity("1 1/2 cups chicken stock"), { qty: "1 1/2 cups", rest: "chicken stock" });
  assert.deepEqual(splitQuantity("2-3 cloves garlic"), { qty: "2-3 cloves", rest: "garlic" });
  assert.deepEqual(splitQuantity("1½ tbsp butter"), { qty: "1½ tbsp", rest: "butter" });
});

test("countItems: section headings aren't counted as steps", () => {
  const steps = ["Meatballs:", "Preheat the oven.", "Form the meatballs.", "Bake.", "Sauce:", "Melt butter.", "Add stock.", "Simmer."];
  assert.equal(countItems(steps), 6);
  assert.equal(countItems(["", "2 eggs"]), 1);
});
