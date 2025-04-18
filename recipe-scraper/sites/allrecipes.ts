import axios from "axios";
import { load } from "cheerio";

export async function scrapeAllRecipes(url: string) {
  const { data } = await axios.get(url);
  const $ = load(data);

  const title = $("h1").text().trim();

  // 👇 Grab JSON-LD structured data
  const jsonLD = $("script[type='application/ld+json']").first().html();
  let ingredients: string[] = [];

  if (jsonLD) {
    try {
      const parsed = JSON.parse(jsonLD);
      const recipeData = Array.isArray(parsed) ? parsed.find(x => x.recipeIngredient) : parsed;
      ingredients = recipeData.recipeIngredient || [];
    } catch (err) {
      console.error("⚠️ Failed to parse JSON-LD:", err);
    }
  }

  const instructions = $(".mntl-sc-block p")
    .map((_, el) => $(el).text().trim())
    .get();

  return { title, ingredients, instructions, sourceUrl: url };
}
