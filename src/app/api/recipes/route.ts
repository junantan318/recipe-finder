import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const archivePath = path.resolve(process.cwd(), "data/recipes.json");

  try {
    const raw = fs.readFileSync(archivePath, "utf-8");
    const recipes = JSON.parse(raw);
    return NextResponse.json(recipes);
  } catch (err: any) {
    console.error("❌ Failed to load archive:", err.message);
    return NextResponse.json(
      { error: "Failed to load archive", details: err.message },
      { status: 500 }
    );
  }
}
