import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET!;

function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
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

  const updatedUser = await User.findOneAndUpdate(
    { email: user.email },
    { $addToSet: { favorites: body } }, // prevent duplicates
    { new: true }
  );

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
