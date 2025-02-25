import { NextResponse } from "next/server";

// ✅ Define a TypeScript interface for the API response
interface Recipe {
  id: string;
  name: string;
  original_video_url?: string; // This property may be undefined
  thumbnail_url: string;
}

// ✅ Update function to use explicit typing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ingredient = searchParams.get("ingredient");

    if (!ingredient) {
      return NextResponse.json({ error: "Missing ingredient parameter" }, { status: 400 });
    }

    const API_KEY = process.env.NEXT_PUBLIC_TASTY_API_KEY;
    if (!API_KEY) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const apiUrl = `https://tasty.p.rapidapi.com/recipes/list?from=0&size=10&q=${ingredient}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": "tasty.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // ✅ Explicitly set type for recipe objects
    const filteredRecipes: Recipe[] = data.results
      .filter((recipe: Recipe) => recipe.original_video_url) // ✅ Keeps only recipes with working video links
      .map((recipe: Recipe) => ({
        id: recipe.id,
        title: recipe.name,
        image: recipe.thumbnail_url,
        sourceUrl: recipe.original_video_url, // ✅ Directly links to the recipe video
      }));

    if (filteredRecipes.length === 0) {
      return NextResponse.json({ error: "No valid recipes found" }, { status: 404 });
    }

    return NextResponse.json({ results: filteredRecipes });
  } catch (error) {
    console.error("Tasty API Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
  }
}
