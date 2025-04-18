const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const categoryUrl = "https://www.allrecipes.com/recipes/15436/everyday-cooking/one-pot-meals/";

async function getRecipeUrlsFromCategory(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const links = [];

  $("a").each((_, el) => {
    const link = $(el).attr("href");
    if (link && link.includes("/recipe/") && !link.includes("#") && !link.includes("/videos/")) {
      links.push(link.split("?")[0]);
    }
  });
  

  // Deduplicate
  return [...new Set(links)];
}

async function scrapeAllRecipes(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const title = $("h1").text().trim();
  const jsonLD = $("script[type='application/ld+json']").first().html();
  let image = "https://placekitten.com/400/300";
  let ingredients = [];
  
  if (jsonLD) {
    try {
      const parsed = JSON.parse(jsonLD);
      let recipeData;
  
      if (Array.isArray(parsed)) {
        // 1. Look for a top‑level Recipe entry, even if @type is an array
        recipeData = parsed.find(item => {
          const t = item["@type"];
          return (t === "Recipe") || (Array.isArray(t) && t.includes("Recipe"));
        });
        // 2. If not found, check the @graph inside the first element
        if (!recipeData && parsed[0] && parsed[0]["@graph"]) {
          recipeData = parsed[0]["@graph"].find(item => {
            const t = item["@type"];
            return (t === "Recipe") || (Array.isArray(t) && t.includes("Recipe"));
          });
        }
      } else {
        const t = parsed["@type"];
        if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) {
          recipeData = parsed;
        } else if (parsed["@graph"]) {
          recipeData = parsed["@graph"].find(item => {
            const tt = item["@type"];
            return (tt === "Recipe") || (Array.isArray(tt) && tt.includes("Recipe"));
          });
        }
      }
  
      if (recipeData) {
        ingredients = recipeData.recipeIngredient || [];
      
        // Add new metadata
        var cuisine = recipeData.recipeCuisine || null;
        var category = recipeData.recipeCategory || null;
        var diet = recipeData.suitableForDiet || recipeData.keywords || null;
      
        // pick the first image, whether it's a string or an array
        const rawImage = recipeData.image;
        if (Array.isArray(rawImage)) {
          image = rawImage[0];
        } else if (typeof rawImage === "string") {
          image = rawImage;
        }
      }
      
      else {
        console.warn("⚠️ No recipeData found in JSON‑LD for:", url);
      }
    } catch (e) {
      console.warn("⚠️ JSON parse error for", url, e.message);
    }
  }
  
  // fallback to page scraping if JSON‑LD gave you nothing
  if (ingredients.length === 0) {
    ingredients = $(".ingredients-item-name")
      .map((_, el) => $(el).text().trim())
      .get();
  }

  // Fallback image if not found in JSON-LD
  if (!image || image.includes("placekitten")) {
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) {
      image = ogImage;
    }
  }

  // Scrape instructions
  const instructions = $(".mntl-sc-block p")
    .map((_, el) => $(el).text().trim())
    .get();

    return {
      id: crypto.randomUUID(),
      title,
      image,
      sourceUrl: url,
      ingredients,
      instructions,
      cuisine,
      category,
      diet
    };
    
}


(async () => {
  console.log(`🔍 Fetching category page: ${categoryUrl}`);
  const urls = await getRecipeUrlsFromCategory(categoryUrl);
  console.log(`📦 Found ${urls.length} recipes`);

  const results = [];

  for (const url of urls) {
    try {
      console.log("➡️ Scraping:", url);
      const recipe = await scrapeAllRecipes(url);
      results.push(recipe);
    } catch (err) {
      console.error("❌ Failed to scrape:", url, err.message);
    }
  }

  const outputPath = path.resolve(__dirname, "../data/recipes.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`✅ Saved ${results.length} recipes to data/recipes.json`);
})();
