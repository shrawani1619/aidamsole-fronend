import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Input, Avatar, Tabs } from '../../components/ui';
import { digitsOnlyMax10, phoneToApi, phoneFieldValue } from '../../utils/phone';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', phone: phoneFieldValue(user?.phone) });

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name || '', phone: phoneFieldValue(user.phone) });
  }, [user?._id, user?.name, user?.phone]);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const setPwd = (k, v) => setPwdForm(p => ({ ...p, [k]: v }));

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ name: profile.name, phone: phoneToApi(profile.phone) }),
    onSuccess: (res) => { updateUser(res.data.user); toast.success('Profile updated!'); }
  });

  const pwdMutation = useMutation({
    mutationFn: () => {
      if (pwdForm.newPassword !== pwdForm.confirmPassword) throw new Error('Passwords do not match');
      if (pwdForm.newPassword.length < 6) throw new Error('Password must be at least 6 characters');
      return authApi.updatePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
    },
    onSuccess: () => { toast.success('Password changed!'); setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: (err) => toast.error(err.message)
  });

  const TABS = [
    { value: 'profile', label: 'Profile', icon: User },
    { value: 'security', label: 'Security', icon: Lock },
    { value: 'about', label: 'About', icon: Shield },
  ];

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div className="card space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <Avatar user={user} size="xl" />
            <div>
              <p className="text-base font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-1">{user?.role?.replace(/_/g, ' ')} · {user?.departmentId?.name || 'No department'}</p>
            </div>
          </div>
          <Input label="Full Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          <Input label="Phone (max 10 digits)" type="tel" inputMode="numeric" maxLength={10}
            value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: digitsOnlyMax10(e.target.value) }))}
            placeholder="9876543210" />
          <div className="bg-surface-secondary rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Account Information</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <span>Email:</span><span className="text-gray-800">{user?.email}</span>
              <span>Role:</span><span className="text-gray-800">{user?.role?.replace(/_/g, ' ')}</span>
              <span>Department:</span><span className="text-gray-800">{user?.departmentId?.name || '—'}</span>
              <span>Dept. Role:</span><span className="text-gray-800">{user?.departmentRole || '—'}</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
            {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
          <Input label="Current Password" type="password" value={pwdForm.currentPassword} onChange={e => setPwd('currentPassword', e.target.value)} placeholder="••••••••" />
          <Input label="New Password" type="password" value={pwdForm.newPassword} onChange={e => setPwd('newPassword', e.target.value)} placeholder="Min. 6 characters" />
          <Input label="Confirm New Password" type="password" value={pwdForm.confirmPassword} onChange={e => setPwd('confirmPassword', e.target.value)} placeholder="Repeat new password" />
          <button className="btn-primary" onClick={() => pwdMutation.mutate()} disabled={pwdMutation.isPending || !pwdForm.currentPassword || !pwdForm.newPassword}>
            {pwdMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      )}

      {tab === 'about' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-4">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AiDamsole" className="h-12 w-auto object-contain" />
            <div>
              <p className="text-base font-bold text-brand-navy">AiDamsole CRM</p>
              <p className="text-xs text-gray-500">Version 1.0.0 · 2025</p>
            </div>
          </div>
          <div className="bg-surface-secondary rounded-xl p-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-700">AiDamsole Agile Services Pvt. Ltd.</p>
            <p className="text-gray-500">Production-ready CRM & Project Management for Digital Marketing Agencies.</p>
            <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <span>Stack:</span><span>React + Node.js + MongoDB</span>
              <span>Real-time:</span><span>Socket.io</span>
              <span>Auth:</span><span>JWT + RBAC</span>
              <span>Departments:</span><span>SEO, Paid Ads, Social, Web Dev, Sales, Accounts</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Confidential — Internal Use Only. All rights reserved © 2025 AiDamsole Agile Services Pvt. Ltd.
          </div>
        </div>
      )}
    </div>
  );
}
