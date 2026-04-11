import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api';
import { Spinner } from '../../components/ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      /* no toast — show inline message */
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      return;
    }
    if (newPassword.length < 6) {
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch {
      /* interceptor */
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-surface-secondary">
        <div className="w-full max-w-sm card p-6 text-center space-y-3">
          <p className="text-sm text-gray-700">Invalid or missing reset link. Request a new one from the login page.</p>
          <Link to="/forgot-password" className="text-sm text-brand-navy font-medium hover:underline">
            Forgot password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-surface-secondary">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={LOGO_SRC} alt="AiDamsole" className="h-10 w-auto object-contain" />
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a password with at least 6 characters.</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={show ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pl-9 pr-10"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input
              type={show ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>
          {newPassword && confirm && newPassword !== confirm && (
            <p className="text-xs text-red-600">Passwords do not match</p>
          )}
          <button
            type="submit"
            disabled={loading || newPassword.length < 6 || newPassword !== confirm}
            className="btn-primary w-full justify-center py-2.5"
          >
            {loading ? <Spinner size="sm" /> : 'Save password'}
          </button>
          <Link to="/login" className="block text-center text-sm text-brand-navy hover:underline">
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}
