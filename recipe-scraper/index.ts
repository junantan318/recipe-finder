import { scrapeAllRecipes } from "./sites/allrecipes";
import fs from "fs";

const url = "https://www.allrecipes.com/recipe/24074/alysias-basic-meat-lasagna/";

(async () => {
  try {
    console.log("🔍 Scraping from:", url);
    const result = await scrapeAllRecipes(url);

    console.log("📦 Scraped Result:", result);

    if (!fs.existsSync("./data")) {
      fs.mkdirSync("./data");
    }

    fs.writeFileSync("./data/recipes.json", JSON.stringify(result, null, 2));
    console.log("✅ Recipe saved to data/recipes.json");
  } catch (err) {
    console.error("❌ Scraper failed:", err);
  }
})();
