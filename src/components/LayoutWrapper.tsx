"use client";

import { useState } from "react";
import Link from "next/link";
import ProfilePage from "@/components/auth/ProfilePage";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";
import { useAuth } from "@/context/AuthContext";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [showProfile, setShowProfile] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const { isLoggedIn } = useAuth();

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-blue-700">
            Recipe Finder
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowProfile(true)}
            className="text-blue-600 hover:underline"
          >
            Profile
          </button>
        </div>
      </header>

      <main className="p-4 mt-20">{children}</main>

      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
          <div className="bg-white w-[300px] h-full shadow-lg p-6">
            <button
              onClick={() => setShowProfile(false)}
              className="mb-4 text-red-500 font-bold"
            >
              ✖ Close
            </button>
            <ProfilePage
              onClose={() => setShowProfile(false)}
              onSignInClick={() => {
                setShowProfile(false);
                setShowLogin(true);
              }}
              onRegisterClick={() => {
                setShowProfile(false);
                setShowRegister(true);
              }}
            />
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-lg p-6">
            <button
              onClick={() => setShowLogin(false)}
              className="mb-4 text-red-500 font-bold"
            >
              ✖ Close
            </button>
            <LoginPage
  onClose={() => setShowLogin(false)}
  onRegisterClick={() => {
    setShowLogin(false);
    setShowRegister(true);
  }}
/>

          </div>
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-lg p-6">
            <button
              onClick={() => setShowRegister(false)}
              className="mb-4 text-red-500 font-bold"
            >
              ✖ Close
            </button>
            <RegisterPage onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}
    </>
  );
}
