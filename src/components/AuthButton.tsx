'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function AuthButton() {
  const { isLoggedIn } = useAuth();

  return isLoggedIn ? (
    <Link href="/profile" className="text-blue-600 hover:underline">
      Profile
    </Link>
  ) : (
    <Link href="/login" className="text-blue-600 hover:underline">
      Login
    </Link>
  );
}
