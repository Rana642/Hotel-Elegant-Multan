'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="bg-white p-8 space-y-5">
      <div>
        <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
          Email
        </label>
        <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
          <Mail size={14} className="text-[#E30613] shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@elegant-suite.com"
            className="flex-1 py-3 font-montserrat text-sm outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block font-montserrat text-xs font-semibold tracking-widest uppercase text-gray-500 mb-2">
          Password
        </label>
        <div className="flex items-center gap-2 border border-gray-200 px-3 focus-within:border-[#1A0B2E] transition-colors">
          <Lock size={14} className="text-[#E30613] shrink-0" />
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="flex-1 py-3 font-montserrat text-sm outline-none"
            required
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600">
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-montserrat">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-red w-full py-4 disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
