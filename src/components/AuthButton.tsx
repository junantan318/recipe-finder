'use client';

import { useAuth } from '../context/AuthContext';

export default function AuthButton() {
  const { isLoggedIn } = useAuth();

  return isLoggedIn ? (
    <span className="text-gray-700">Logged in</span>
  ) : (
    <a href="/login" className="text-blue-600 hover:underline">
      Logins
    </a>
  );
}

