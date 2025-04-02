'use client';

import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    setEmail(storedEmail);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    window.location.href = '/login';
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
      {email ? (
        <p className="text-gray-700 mb-4">Logged in as <strong>{email}</strong></p>
      ) : (
        <p className="text-gray-500 mb-4">No email found. Are you logged in?</p>
      )}
      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
}
