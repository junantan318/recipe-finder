'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setLoading(true);
    setMsg(''); // clear old message
    setSuccess(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setMsg('🎉 Registration successful!');
      
        // 👇 close the drawer after 1.5s
        setTimeout(() => {
          if (onClose) onClose();
          router.push('/');
        }, 1500);
      }
       else {
        setSuccess(false);
        setMsg(data.error || '❌ Something went wrong. Please try again.');
      }
    } catch  {
      setSuccess(false);
      setMsg('Please try again ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Register</h1>

        <input
          type="email"
          placeholder="Email"
          className="border border-gray-300 p-3 mb-3 w-full rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 p-3 mb-4 w-full rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={register}
          className={`w-full py-3 rounded font-semibold text-white ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>

        {msg && (
          <div
            className={`mt-4 px-4 py-2 rounded text-center font-medium transition-all duration-200 ${
              success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}