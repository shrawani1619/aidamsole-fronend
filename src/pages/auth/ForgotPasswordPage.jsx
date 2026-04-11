import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '../../services/api';
import { Spinner } from '../../components/ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setDone(true);
    } catch {
      /* interceptor toasts */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-surface-secondary">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={LOGO_SRC} alt="AiDamsole" className="h-10 w-auto object-contain" />
        </div>

        {done ? (
          <div className="card p-6 text-center space-y-3">
            <p className="text-sm text-gray-700">
              If an account exists for <span className="font-medium">{email}</span>, we sent a password reset link.
              Check your inbox and spam folder.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-navy font-medium hover:underline">
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Forgot password</h1>
              <p className="text-gray-500 text-sm mt-1">We’ll email you a link to reset your password.</p>
            </div>
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? <Spinner size="sm" /> : 'Send reset link'}
              </button>
              <Link to="/login" className="block text-center text-sm text-brand-navy hover:underline">
                Back to sign in
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
