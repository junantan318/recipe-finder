import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!; // make sure this is defined in .env.local

export function verifyToken(token: string): { email: string } {
    console.log("🔐 Verifying token with secret:", JWT_SECRET);
    console.log("🔐 Token to verify:", token);

  return jwt.verify(token, JWT_SECRET) as { email: string };
}
