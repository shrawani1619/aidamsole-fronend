import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-brand-navy p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white transform -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative">
          <img src={LOGO_SRC} alt="AiDamsole" className="h-12 w-auto object-contain" />
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your Agency's<br />Operating System.
          </h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-md">
            Manage 1,000+ clients, track every task, monitor health scores, and drive retention — all from one powerful dashboard.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { label: 'Clients', value: '1,000+' },
              { label: 'Departments', value: '6' },
              { label: 'SOPs Built-in', value: '8' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-white text-xl font-bold">{s.value}</p>
                <p className="text-blue-200 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-blue-300 text-xs">
          © 2025 AiDamsole Agile Services Pvt. Ltd. · Confidential Internal System
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-secondary">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={LOGO_SRC} alt="AiDamsole" className="h-10 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your CRM account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required placeholder="you@aidamsole.com"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input pl-9" autoComplete="email" autoFocus />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPwd ? 'text' : 'password'} required placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input pl-9 pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <Link to="/forgot-password" className="text-xs font-medium text-brand-navy hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-600 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <Spinner size="sm" /> : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>

          <div className="mt-8 p-4 bg-white rounded-xl border border-gray-100 shadow-card">
            <p className="text-xs font-semibold text-gray-500 mb-2">Demo credentials</p>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between"><span>Super Admin</span><span className="font-mono text-gray-500">admin@aidamsole.com</span></div>
              <div className="flex justify-between"><span>SEO Manager</span><span className="font-mono text-gray-500">seo.manager@...</span></div>
              <div className="flex justify-between"><span>Password</span><span className="font-mono text-brand-navy font-medium">admin123</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
