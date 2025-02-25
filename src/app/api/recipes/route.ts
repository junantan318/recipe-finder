import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("🔍 Tasty API Key (from env):", process.env.NEXT_PUBLIC_TASTY_API_KEY); // ✅ Debugging

  if (!process.env.NEXT_PUBLIC_TASTY_API_KEY) {
    console.error("🚨 Tasty API key is missing!");
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  return NextResponse.json({ message: "API key is working!" });
}

// ✅ Prevent unsupported HTTP methods
export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
