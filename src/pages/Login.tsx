import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Leaf, Shield, UserCheck, Lock, ArrowRight, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    setLoading(true);
    setError('');
    const targetEmail = loginEmail || email;
    const targetPassword = loginPassword || password;

    try {
      const res = await api.post('/auth/login', {
        email: targetEmail,
        password: targetPassword,
      });

      if (res.data.success) {
        login(res.data.token, res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickRoles = [
    {
      role: 'Factory Admin',
      name: 'Dr. Rohan Fernando',
      email: 'admin@fadna.com',
      pass: 'admin123',
      color: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
    },
    {
      role: 'Production Manager',
      name: 'Kavinda Jayasuriya',
      email: 'manager@fadna.com',
      pass: 'manager123',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    },
    {
      role: 'Store Keeper',
      name: 'Sunil Weerasinghe',
      email: 'store@fadna.com',
      pass: 'store123',
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    },
    {
      role: 'Auditor / Viewer',
      name: 'Nadeesha Perera',
      email: 'viewer@fadna.com',
      pass: 'viewer123',
      color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center shadow-xl shadow-emerald-950/50 mb-4 glow-emerald">
            <Leaf className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            FADNA PRODUCTION SYSTEM
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Factory Stock Control, Batch Tracking & MRP Planning
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Staff Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@fadna.com"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1-Click Role Access (Demo)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickRoles.map((role) => (
                <button
                  key={role.email}
                  type="button"
                  onClick={() => {
                    setEmail(role.email);
                    setPassword(role.pass);
                    handleLogin(role.email, role.pass);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] ${role.color}`}
                >
                  <p className="text-[11px] font-bold">{role.role}</p>
                  <p className="text-[10px] text-slate-400 truncate">{role.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
