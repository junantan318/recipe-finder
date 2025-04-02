import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth'; // adjust path as needed
import dbConnect from '@/lib/db'; // your db connection util
import User from '@/models/User'; // your User model


export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Connecting to DB...');
    await dbConnect();

    const token = req.headers.get('authorization')?.split(' ')[1];
    console.log('📦 Token:', token);
    if (!token) {
      console.warn('❌ No token');
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const user = verifyToken(token); // this can throw
    console.log('✅ Verified user:', user);

    const foundUser = await User.findOne({ email: user.email });
    console.log('🧠 Found user:', foundUser?.email);

    return NextResponse.json({ ingredients: foundUser?.savedIngredients || [] });
  } catch (err) {
    console.error('❌ API /ingredients failed:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

    const user = verifyToken(token);
    const body = await req.json();

    await User.updateOne(
      { email: user.email },
      { $set: { savedIngredients: body.ingredients } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

