import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const validCuisines = [
  "African", "American", "British", "Cajun", "Caribbean", "Chinese", "Eastern European",
  "European", "French", "German", "Greek", "Indian", "Irish", "Italian", "Japanese",
  "Jewish", "Korean", "Latin American", "Mediterranean", "Mexican", "Middle Eastern",
  "Nordic", "Southern", "Spanish", "Thai", "Vietnamese"
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ingredientParam = searchParams.get("ingredient");
  const cuisineRaw = searchParams.get("cuisine");
  const allergensParam = searchParams.get("allergens");
  const excludeParam = searchParams.get("exclude");
  const dietParam = searchParams.get("diet");
  const typeParam = searchParams.get("type");

  if (cuisineRaw && !validCuisines.includes(cuisineRaw)) {
    return NextResponse.json(
      { error: "Invalid cuisine type provided" },
      { status: 400 }
    );
  }

  const includeIngredients = ingredientParam || "";
  const excludeIngredients = excludeParam || "";
  const cuisine = cuisineRaw || "";
  const intolerances = allergensParam || "";

  const apiKey = process.env.SPOON_KEY;
  const apiUrl = "https://api.spoonacular.com/recipes/complexSearch";

  const params: Record<string, any> = {
    number: 10,
    addRecipeInformation: true,
    fillIngredients: true,
    apiKey,
  };

  if (includeIngredients) params.includeIngredients = includeIngredients;
  if (excludeIngredients) params.excludeIngredients = excludeIngredients;
  if (cuisine) params.cuisine = cuisine;
  if (intolerances) params.intolerances = intolerances;
  if (dietParam) params.diet = dietParam;
  if (typeParam) params.type = typeParam;

  console.log("Requesting Spoonacular with params:", params);

  try {
    const response = await axios.get(apiUrl, { params });
    console.log("Spoonacular API response:", JSON.stringify(response.data, null, 2));
    const results = response.data.results || [];

    // Apply strict cuisine filtering
    const strictlyFiltered = cuisine
      ? results.filter(recipe => recipe.cuisines?.includes(cuisine))
      : results;

    return NextResponse.json({ results: strictlyFiltered });
  } catch (error: any) {
    console.error("Error fetching from Spoonacular:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes", details: error.message },
      { status: 500 }
    );
  }
}
