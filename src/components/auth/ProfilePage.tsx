'use client';

import { useEffect, useState } from 'react';

export default function ProfilePage({
  onClose,
  onSignInClick,
  onRegisterClick,
  onLogoutSuccess,
}: {
  onClose?: () => void;
  onSignInClick?: () => void;
  onRegisterClick?: () => void;
  onLogoutSuccess?: () => void;
}) {

  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    setEmail(storedEmail);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
  
    if (onLogoutSuccess) onLogoutSuccess();
    if (onClose) onClose();
    if (onSignInClick) onSignInClick();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>

      {email ? (
        <>
          <p className="text-gray-700 mb-4">Logged in as <strong>{email}</strong></p>
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
              onClick={onSignInClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Sign In
            </button>
            <button
            onClick={onRegisterClick}
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
