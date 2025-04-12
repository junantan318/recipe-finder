import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const apiKey = process.env.RAPIDAPI_KEY;
  const headers = {
    "X-RapidAPI-Key": apiKey,
    "X-RapidAPI-Host": "tasty.p.rapidapi.com",
  };

  // ✅ If we're fetching one recipe by ID
  if (id) {
    const detailUrl = `https://tasty.p.rapidapi.com/recipes/get-more-info?id=${id}`;
    try {
      const res = await axios.get(detailUrl, { headers });
      const recipe = res.data;

      const ingredients = recipe.sections?.flatMap((section: { components: any[] }) =>
        section.components?.map((comp: { ingredient?: { name?: string }, raw_text: string }) =>
          comp.ingredient?.name || comp.raw_text
        )        
        ) || [];

      return NextResponse.json({
        id: recipe.id,
        title: recipe.name,
        image: recipe.thumbnail_url,
        sourceUrl: recipe.original_video_url || `https://tasty.co/recipe/${recipe.slug}`,
        ingredients,
      });
    } catch (err: any) {
      console.error("❌ Failed to fetch recipe by ID:", err?.response?.data || err.message);
      return NextResponse.json({ error: "Failed to fetch recipe by ID" }, { status: 500 });
    }
  }

  // ✅ Default: recipe search (your original logic)
  const ingredientParam = searchParams.get("ingredient");
  const excludeParam = searchParams.get("exclude");
  const dietParam = searchParams.get("diet");
  const typeParam = searchParams.get("type");
  const tagsParam = searchParams.get("tags");

  const includeIngredients = ingredientParam || "";
  const excludeIngredient = excludeParam?.toLowerCase() || "";

  const apiUrl = "https://tasty.p.rapidapi.com/recipes/list";
  const params: Record<string, any> = {
    from: 0,
    size: 40,
  };

  if (includeIngredients) params.q = includeIngredients;

  const tastyDiet = {
    "vegetarian": "vegetarian",
    "vegan": "vegan",
    "gluten free": "gluten_free",
  }[dietParam || ""];

  const tastyType = {
    "breakfast": "breakfast",
    "dessert": "dessert",
    "snack": "snack",
    "main course": "dinner",
    "lunch": "lunch",
    "dinner": "dinner",
  }[typeParam || ""];

  if (tastyDiet) params.tags = tastyDiet;
  if (tastyType) params.tags = params.tags ? `${params.tags},${tastyType}` : tastyType;
  if (tagsParam) params.tags = params.tags ? `${params.tags},${tagsParam}` : tagsParam;

  try {
    const response = await axios.get(apiUrl, { params, headers });
    const results = response.data.results || [];

    const strictlyFiltered = results.filter(recipe => {
      const description = recipe.description?.toLowerCase() || "";
      return excludeIngredient ? !description.includes(excludeIngredient) : true;
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
        ingredients,
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
