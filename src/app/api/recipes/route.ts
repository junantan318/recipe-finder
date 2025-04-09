import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ingredientParam = searchParams.get("ingredient");
  const excludeParam = searchParams.get("exclude");
  const dietParam = searchParams.get("diet");
  const typeParam = searchParams.get("type");
  const tagsParam = searchParams.get("tags");

  const includeIngredients = ingredientParam || "";
  const excludeIngredient = excludeParam?.toLowerCase() || "";

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiUrl = "https://tasty.p.rapidapi.com/recipes/list";

  const headers = {
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": "tasty.p.rapidapi.com"
  };

  const params: Record<string, any> = {
    from: 0,
    size: 40,
  };

  if (includeIngredients) params.q = includeIngredients;

  const tastyDiet = {
    "vegetarian": "vegetarian",
    "vegan": "vegan",
    "gluten free": "gluten_free"
  }[dietParam || ""];

  const tastyType = {
    "breakfast": "breakfast",
    "dessert": "dessert",
    "snack": "snack",
    "main course": "dinner",
    "lunch": "lunch",
    "dinner": "dinner"
  }[typeParam || ""];

  if (tastyDiet) params.tags = tastyDiet;
  if (tastyType) params.tags = params.tags ? `${params.tags},${tastyType}` : tastyType;
  if (tagsParam) params.tags = params.tags ? `${params.tags},${tagsParam}` : tagsParam;

  console.log("🔍 Requesting Tasty API with:", { params });

  try {
    const response = await axios.get(apiUrl, { params, headers });
    const results = response.data.results || [];

    results.forEach(recipe => {
      console.log("📦", recipe.name, "→ tags:", recipe.tags);
    });

    const strictlyFiltered = results.filter(recipe => {
      const description = recipe.description?.toLowerCase() || "";
      const matchesExclude = excludeIngredient ? !description.includes(excludeIngredient) : true;
      return matchesExclude;
    });

    const formattedRecipes = strictlyFiltered.map(recipe => {
      const ingredients = recipe.sections?.flatMap((section: any) =>
        section.components?.map((comp: any) => comp.ingredient?.name || comp.raw_text)
      ) || [];
    
      return {
        id: recipe.id,
        title: recipe.name,
        image: recipe.thumbnail_url || "/fallback.jpg",
        sourceUrl: recipe.original_video_url || `https://tasty.co/recipe/${recipe.slug}`,
        ingredients, // 👈 Add this
      };
    });
    

    return NextResponse.json(formattedRecipes);
  } catch (error: any) {
    console.error("❌ Tasty API Error:", error?.response?.data || error.message);
    return NextResponse.json(
      { error: "Failed to fetch recipes", details: error.message },
      { status: 500 }
    );
  }
}
