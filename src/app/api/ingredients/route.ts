import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ingredient from "@/models/Ingredient";

export async function GET() {
  await dbConnect();
  const ingredients = await Ingredient.find();
  return NextResponse.json(ingredients);
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const body = await request.json();
  await Ingredient.create(body);
  return NextResponse.json({ message: "Ingredient added" });
}

export async function PUT(request: NextRequest) {
  await dbConnect();
  const body = await request.json();
  console.log("🧾 PUT body:", body);

  if (!Array.isArray(body.ingredients)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const result = await Ingredient.deleteMany({});
  console.log("🧼 Deleted:", result.deletedCount);

  if (body.ingredients.length > 0) {
    const newDocs = body.ingredients.map((name: string) => ({ name }));
    await Ingredient.insertMany(newDocs);
  }

  return NextResponse.json({ message: "Ingredients updated successfully" });
}

export async function DELETE(request: NextRequest) {
  await dbConnect();
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Missing ingredient name" }, { status: 400 });
  }

  const result = await Ingredient.deleteOne({ name: body.name });
  return NextResponse.json({ message: "Deleted", deletedCount: result.deletedCount });
}
