import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET!;

interface DecodedToken {
  email: string;
  iat?: number;
  exp?: number;
}


function verifyToken(token: string): DecodedToken {
  return jwt.verify(token, JWT_SECRET) as DecodedToken;
}


// ✅ GET: fetch all favorites
export async function GET(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = verifyToken(token);
  

  const foundUser = await User.findOne({ email: user.email });
  return NextResponse.json({ favorites: foundUser.favorites || [] });
}

// ✅ POST: add a recipe to favorites
export async function POST(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userData = verifyToken(token);
  const body = await req.json();

  // ✅ Validate input
  const { id, title, image, sourceUrl, ingredients } = body;

  if (!id || !title || !image || !sourceUrl || !Array.isArray(ingredients)) {
    return NextResponse.json(
      { error: "Missing or invalid fields in request body" },
      { status: 400 }
    );
  }

  const user = await User.findOne({ email: userData.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const alreadyExists = user.favorites.some((fav: any) => fav.id === id);
  if (alreadyExists) {
    return NextResponse.json({ message: "Recipe already favorited" }, { status: 200 });
  }

  const newFavorite = { id, title, image, sourceUrl, ingredients };
  user.favorites.push(newFavorite);
  await user.save();

  return NextResponse.json({ message: "Recipe added to favorites", favorites: user.favorites });
}




// ✅ DELETE: remove a favorite by recipe ID
export async function DELETE(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = verifyToken(token);
  
  const body = await req.json();

  const updatedUser = await User.findOneAndUpdate(
    { email: user.email },
    { $pull: { favorites: { id: body.id } } },
    { new: true }
  );

  return NextResponse.json({ favorites: updatedUser.favorites });
}
