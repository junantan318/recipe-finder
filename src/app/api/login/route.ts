import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  await dbConnect();
  const { email, password } = await req.json();

  const user = await User.findOne({ email });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  console.log("🔐 Signing token with secret:", process.env.JWT_SECRET);
  const token = jwt.sign(
    { email: user.email }, // payload
    JWT_SECRET,            // ✅ sign with correct secret
    { expiresIn: '7d' }
    
  );

  return NextResponse.json({ token });
}
