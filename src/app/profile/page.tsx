'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    setEmail(storedEmail);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    if (onClose) onClose();
    router.push('/login');
  };

  const handleRedirect = (path: string) => {
    if (onClose) onClose();
    router.push(path);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Your Profile</h1>

      {email ? (
        <>
          <p className="text-gray-700 mb-4">
            Logged in as <strong>{email}</strong>
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <p className="text-gray-500 mb-4">You are not logged in.</p>
          <div className="flex gap-4">
            <button
              onClick={() => handleRedirect('/login')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Sign In
            </button>
            <button
              onClick={() => handleRedirect('/register')}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Register
            </button>
          </div>
        </>
      )}
    </div>
  );
}
