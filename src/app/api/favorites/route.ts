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
  const user = verifyToken(token);

  const foundUser = await User.findOne({ email: user.email });
  return NextResponse.json({ favorites: foundUser.favorites || [] });
}

// ✅ POST: add a recipe to favorites
export async function POST(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get('authorization')?.split(' ')[1];
  const user = verifyToken(token);
  const body = await req.json();

  // Ensure ingredients always exist
  const favoriteToAdd = {
    id: body.id,
    title: body.title,
    image: body.image,
    sourceUrl: body.sourceUrl,
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
  };

  const updatedUser = await User.findOneAndUpdate(
    { email: user.email },
    { $addToSet: { favorites: favoriteToAdd } },
    { new: true }
  );
  console.log("🔄 Saving favorite with:", favoriteToAdd);

  return NextResponse.json({ favorites: updatedUser.favorites });
}


// ✅ DELETE: remove a favorite by recipe ID
export async function DELETE(req: NextRequest) {
  await dbConnect();
  const token = req.headers.get('authorization')?.split(' ')[1];
  const user = verifyToken(token);
  const body = await req.json();

  const updatedUser = await User.findOneAndUpdate(
    { email: user.email },
    { $pull: { favorites: { id: body.id } } },
    { new: true }
  );

  return NextResponse.json({ favorites: updatedUser.favorites });
}
