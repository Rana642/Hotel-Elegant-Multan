'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2, Check, ShieldCheck, User } from 'lucide-react';
import { inviteStaff } from './actions';

// Add-member form. Admin fills email + password + picks role and the server
// action creates the Supabase Auth user + admin_users row in one shot.
// Deliberately simple — no email invites, no forgot-password flow — because
// this is a 2-person hotel team, not a SaaS onboarding.

export default function TeamForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'receptionist'>('receptionist');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    startTransition(async () => {
      const result = await inviteStaff({ email, password, role });
      if (result.success) {
        setSuccess(true);
        setEmail('');
        setPassword('');
        setRole('receptionist');
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(result.error || 'Failed to add user.');
      }
    });
  };

  const inputClass = 'w-full border border-gray-200 px-3.5 py-2.5 font-montserrat text-sm outline-none focus:border-[#1A0B2E] transition-colors rounded';
  const labelClass = 'block font-montserrat text-[11px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 p-5 space-y-4">
      <div>
        <h3 className="font-playfair font-semibold text-base text-[#1A0B2E]">Add member</h3>
        <p className="text-[11px] font-montserrat text-gray-500 mt-0.5">
          Creates a new login for the dashboard.
        </p>
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="reception@elegant-suite.com"
          required
          autoComplete="off"
        />
      </div>

      <div>
        <label className={labelClass}>Temporary password</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass + ' font-mono text-xs'}
          placeholder="min 8 characters"
          minLength={8}
          required
          autoComplete="new-password"
        />
        <p className="text-[10px] text-gray-400 mt-1 font-montserrat">
          Share this once with the person; they can change it later.
        </p>
      </div>

      <div>
        <label className={labelClass}>Role</label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: 'receptionist', label: 'Reception', desc: 'Bookings + Inquiries only', Icon: User },
              { value: 'admin',        label: 'Admin',     desc: 'Full access',                Icon: ShieldCheck },
            ] as const
          ).map(({ value, label, desc, Icon }) => (
            <label
              key={value}
              className={`flex flex-col gap-1 px-3 py-2.5 border rounded cursor-pointer transition-all ${
                role === value ? 'border-[#1A0B2E] bg-[#1A0B2E]/[0.04]' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              <div className="flex items-center gap-2">
                <Icon size={14} className={role === value ? 'text-[#1A0B2E]' : 'text-gray-400'} />
                <span className={`font-montserrat font-semibold text-xs ${role === value ? 'text-[#1A0B2E]' : 'text-gray-600'}`}>
                  {label}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-montserrat">{desc}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#E30613] bg-red-50 border border-red-200 px-3 py-2 rounded font-montserrat">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded font-montserrat flex items-center gap-1.5">
          <Check size={14} /> Member added successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-red w-full py-2.5 text-xs disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? <><Loader2 size={14} className="animate-spin" /> Adding…</> : <><UserPlus size={14} /> Add member</>}
      </button>
    </form>
  );
}
