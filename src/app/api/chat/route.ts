import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const API_KEY = process.env.COHERE_API_KEY; // ✅ Using Cohere API Key

  if (!API_KEY) {
    console.error("🚨 Cohere API key is missing!");
    return NextResponse.json({ error: "Cohere API key missing" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const ingredients = body.ingredients;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "No valid ingredients provided" }, { status: 400 });
    }
    

    const prompt = `
      I have the following ingredients: ${ingredients.join(", ")}.
      Suggest a creative recipe I can make with these.
      Provide a recipe name, a short description, and key preparation steps.
    `;

    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "command", // ✅ Cohere's AI model for text generation
        prompt: prompt,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("Cohere API Error:", await response.text());
      return NextResponse.json({ error: "Cohere API request failed" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ reply: data.generations[0].text });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to generate recipe" }, { status: 500 });
  }
}
