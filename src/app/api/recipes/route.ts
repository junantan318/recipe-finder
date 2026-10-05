import { NextResponse } from "next/server";
import { createRecipe, findBySourceKey, listRecipes } from "@/lib/server/db.ts";
import { toDraft } from "@/lib/server/validate.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listRecipes());
}

export async function POST(request: Request) {
  const draft = toDraft(await request.json());
  if (draft.sourceKey) {
    const duplicate = findBySourceKey(draft.sourceKey);
    if (duplicate) return NextResponse.json({ error: "Already saved", duplicate }, { status: 409 });
  }
  return NextResponse.json(createRecipe(draft), { status: 201 });
}
