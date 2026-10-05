import { NextResponse } from "next/server";
import { deleteRecipe, getRecipe, saveThumbnail, updateRecipe } from "@/lib/server/db.ts";
import { toPatch } from "@/lib/server/validate.ts";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Recipe not found" }, { status: 404 });

export async function GET(_req: Request, { params }: Params) {
  const recipe = getRecipe(Number((await params).id));
  return recipe ? NextResponse.json(recipe) : notFound();
}

export async function PATCH(request: Request, { params }: Params) {
  const id = Number((await params).id);
  if (!getRecipe(id)) return notFound();
  const { thumbnailData, ...patch } = toPatch(await request.json());
  if (thumbnailData) saveThumbnail(id, thumbnailData);
  return NextResponse.json(updateRecipe(id, patch));
}

export async function DELETE(_req: Request, { params }: Params) {
  return deleteRecipe(Number((await params).id)) ? new NextResponse(null, { status: 204 }) : notFound();
}
