import { NextRequest, NextResponse } from "next/server";
import { mockRecipes } from "../../../../mock/recipe";

export async function GET(request: NextRequest) {
  console.log("✅ Reached mock recipe route");

  const { searchParams } = new URL(request.url);
  const cuisine = searchParams.get("cuisine");
  const diet = searchParams.get("diet");
  const type = searchParams.get("type");

  console.log("🔍 Filters:", { cuisine, diet, type });

  const filtered = mockRecipes.filter(recipe => {
    const matchesCuisine = cuisine ? recipe.cuisines.includes(cuisine) : true;
    const matchesDiet = diet ? recipe.diet === diet : true;
    const matchesType = type ? recipe.type === type : true;
    return matchesCuisine && matchesDiet && matchesType;
  });

  console.log(`📦 Returning ${filtered.length} recipes`);

  return NextResponse.json({ results: filtered });
}
