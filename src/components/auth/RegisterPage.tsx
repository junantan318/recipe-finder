'use client';

import { useState } from 'react';
import { UserPlus, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Register({
  onClose,
  onLoginClick,
}: {
  onClose?: () => void;
  onLoginClick?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const register = async () => {
    setLoading(true);
    setMsg('');
    setSuccess(false);
  
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
    try {
      const res = await fetch(`${baseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await res.json();
  
      if (res.ok) {
        setSuccess(true);
        setMsg('🎉 Registration successful!');
  
        // ✅ Save token immediately
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', email);
  
        // ✅ Auto-refresh login state
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        setSuccess(false);
        setMsg(data.error || '❌ Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error("Registration error:", error);
      setSuccess(false);
      setMsg('❌ Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  

  const handleLoginClick = () => {
    if (onClose) onClose();
    if (onLoginClick) onLoginClick();
  };
  

  return (
    <div className="min-h-screen flex justify-center p-4 pt-20">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700">Register</h1>
          <p className="text-sm text-gray-500">Create your account to get started</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className={`text-center text-sm ${success ? 'text-green-600' : 'text-red-500'}`}>{msg}</div>

        <button
          onClick={register}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-blue-700"
          disabled={loading}
        >
          <UserPlus size={18} />
          <span>{loading ? 'Registering...' : 'Register'}</span>
        </button>

        <div className="text-center text-sm">
          Already have an account?{' '}
          <button
            onClick={handleLoginClick}
            className="text-blue-600 hover:underline flex items-center justify-center"
          >
            <LogIn size={14} className="mr-1" /> Login
          </button>
        </div>
      </div>
    </div>
  );
}
