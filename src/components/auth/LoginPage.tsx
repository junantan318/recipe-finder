'use client';

import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';


export default function Login({
  onClose,
  onRegisterClick,
  onLoginSuccess, // ✅ new prop
}: {
  onClose?: () => void;
  onRegisterClick?: () => void;
  onLoginSuccess?: () => void; // ✅
}) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    setMsg("Logging in...");
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
  
      const data = await res.json();
      console.log("🧾 Login response:", data);
  
      if (!res.ok) {
        if (res.status === 401) {
          setMsg("Incorrect email or password");
        } else {
          setMsg(data.error || "Login failed");
        }
        return;
      }
  
      // ✅ Success path
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', email);
      login(); // Update auth context
      setMsg("✅ Logged in!");
  
      if (onClose) onClose();
      if (onLoginSuccess) onLoginSuccess(); // ✅ trigger data refresh
      router.push('/');
    } catch (err) {
      console.error("Login error:", err);
      setMsg("Something went wrong");
    }
  };
  
  
  
  return (
    <div className="min-h-screen flex justify-center p-4 pt-20">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700">Login</h1>
          <p className="text-sm text-gray-500">Enter your email and password to log in</p>
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

        <div className="text-center text-sm text-red-500">{msg}</div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-blue-700"
        >
          <LogIn size={18} />
          <span>Login</span>
        </button>

        <div className="text-center text-sm">
  Don’t have an account?{' '}
  <button
    onClick={() => {
      if (onClose) onClose();
      if (onRegisterClick) onRegisterClick();
    }}
    className="text-blue-600 hover:underline flex items-center justify-center"
  >
    <UserPlus size={14} className="mr-1" /> Register
  </button>
</div>

      </div>
    </div>
  );
}
