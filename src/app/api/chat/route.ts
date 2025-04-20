import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const API_KEY = process.env.COHERE_API_KEY;

  if (!API_KEY) {
    console.error("🚨 Cohere API key is missing!");
    return NextResponse.json({ error: "Cohere API key missing" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const message = body.message || "";
    const ingredients = body.ingredients || [];
    
    let prompt = "";
    
    if (message && Array.isArray(ingredients) && ingredients.length > 0) {
      const names = ingredients.map((i: { name: string }) => i.name).join(", ");
      prompt = `${message}\n\nHere are the ingredients I have: ${names}.\nPlease create a recipe using them.`;
    } else if (message) {
      prompt = message;
    } else if (Array.isArray(ingredients) && ingredients.length > 0) {
      const names = ingredients.map((i: { name: string }) => i.name).join(", ");
      prompt = `I have the following ingredients: ${names}. Suggest a creative recipe I can make with these.`;
    } else {
      return NextResponse.json({ error: "Missing message or valid ingredients" }, { status: 400 });
    }
    

    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "command",
        prompt,
        max_tokens: 800,
        temperature: 0.7,
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
