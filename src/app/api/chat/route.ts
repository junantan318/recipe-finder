import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("🔍 Cohere API Key (from env):", process.env.COHERE_API_KEY); // ✅ Debugging

  if (!process.env.COHERE_API_KEY) {
    console.error("🚨 Cohere API key is missing!");
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  return NextResponse.json({ message: "API key is working!" });
}

// ✅ Ensure GET requests return an error instead of 405
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
