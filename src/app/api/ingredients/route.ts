import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET!;

function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { email: string };
}

// ✅ GET: return ingredients for logged-in user
export async function GET(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = verifyToken(token);
  const user = await User.findOne({ email });
  return NextResponse.json(user?.ingredients || []);
}

// ✅ POST: add a new ingredient
export async function POST(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = verifyToken(token);
  const { name, expires } = await req.json();

  if (!name || !expires) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await User.findOne({ email });
  user.ingredients.push({ name, expires });
  await user.save();

  return NextResponse.json({ message: "Ingredient added" });
}

// ✅ PUT: replace entire ingredients list
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const email = (decoded as jwt.JwtPayload).email;

    if (!email) {
      return NextResponse.json({ error: "Token missing email" }, { status: 401 });
    }

    const body = await req.json();
    console.log("🧾 PUT body:", body);

    if (!Array.isArray(body.ingredients)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    // ✅ Overwrite the ingredients for this user
    const update = await User.updateOne(
      { email },
      { ingredients: body.ingredients }
    );

    console.log("✅ Updated user ingredients:", update.modifiedCount);
    return NextResponse.json({ message: "Ingredients cleared" });
  } catch (err) {
    console.error("🚨 PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ✅ DELETE: remove a single ingredient by name
export async function DELETE(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = verifyToken(token);
  const { name } = await req.json();

  await User.updateOne(
    { email },
    { $pull: { ingredients: { name } } }
  );

  return NextResponse.json({ message: "Ingredient removed" });
}
