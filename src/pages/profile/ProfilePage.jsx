import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Lock, Save, Upload, X, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, uploadApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Input, Avatar, PageLoader, Tabs, ConfirmDialog } from '../../components/ui';
import { digitsOnlyMax10, phoneToApi, phoneFieldValue } from '../../utils/phone';

const TAB_VALUES = ['profile', 'security', 'about'];

function formatPhoneDisplay(phone) {
  const d = phoneFieldValue(phone);
  return d || '—';
}

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = TAB_VALUES.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'profile';
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (TAB_VALUES.includes(t)) setTab(t);
  }, [searchParams]);

  const goTab = (next) => {
    setTab(next);
    if (next === 'profile') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: next }, { replace: true });
    }
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    avatar: '',
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: phoneFieldValue(user.phone),
      avatar: user.avatar || '',
    });
  }, [user]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  const avatarFileRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const sendPasswordResetLink = async () => {
    if (!user?.email) return;
    setResetSending(true);
    try {
      const { data } = await authApi.forgotPassword({ email: String(user.email).trim().toLowerCase() });
      toast.success(data?.message || 'Check your email for the reset link.');
      setResetConfirmOpen(false);
    } catch {
      /* error toast from api interceptor */
    } finally {
      setResetSending(false);
    }
  };

  const syncFormFromUser = () => {
    if (!user) return;
    setForm({
      name: user.name || '',
      phone: phoneFieldValue(user.phone),
      avatar: user.avatar || '',
    });
  };

  const startEdit = () => {
    syncFormFromUser();
    setEditing(true);
  };

  const cancelEdit = () => {
    syncFormFromUser();
    setEditing(false);
  };

  const mutation = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        name: form.name.trim(),
        phone: phoneToApi(form.phone),
        avatar: form.avatar.trim(),
      }),
    onSuccess: (res) => {
      updateUser(res.data.user);
      toast.success('Profile saved');
      setEditing(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    mutation.mutate();
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (JPG, PNG, GIF, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5 MB or smaller.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const { data } = await uploadApi.single(file);
      const url = data.file?.url;
      if (!url) throw new Error('No file URL returned');
      setForm((p) => ({ ...p, avatar: url }));
      const r = await authApi.updateProfile({
        name: formRef.current.name.trim(),
        phone: phoneToApi(formRef.current.phone),
        avatar: url,
      });
      updateUser(r.data.user);
      toast.success('Profile photo updated');
    } catch {
      /* toast from api interceptor */
    } finally {
      setUploadingAvatar(false);
    }
  };

  const TABS = [
    { value: 'profile', label: 'Profile', icon: User },
    { value: 'security', label: 'Security', icon: Lock },
    { value: 'about', label: 'About', icon: Shield },
  ];

  if (loading || !user) return <PageLoader />;

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="page-header">
        <h2 className="page-title">Profile</h2>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={goTab} />

      {tab === 'profile' && (
        <div className="card overflow-hidden">
          {!editing ? (
            <>
              <div className="flex items-start justify-between gap-4 p-6 pb-5 border-b border-gray-100">
                <div className="flex gap-5 min-w-0">
                  <Avatar user={user} size="xl" className="flex-shrink-0 w-24 h-24 text-2xl !rounded-2xl" />
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{user.departmentRole || '—'}</p>
                    <p className="text-xs text-gray-400 mt-2 capitalize">
                      {user.role?.replace(/_/g, ' ')} · {user.departmentId?.name || 'No department'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-sm font-semibold text-brand-navy hover:underline flex-shrink-0"
                >
                  Edit
                </button>
              </div>

              <div className="p-6 pt-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Contact information</h3>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="text-sm font-semibold text-brand-navy hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email address</dt>
                    <dd className="text-sm text-gray-900 mt-1 break-all">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                    <dd className="text-sm text-gray-900 mt-1">{formatPhoneDisplay(user.phone)}</dd>
                  </div>
                </dl>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Edit profile</h2>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Cancel editing"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="flex flex-col items-start gap-3">
                  <Avatar user={{ ...user, name: form.name, avatar: form.avatar }} size="xl" className="!rounded-2xl w-24 h-24 text-2xl" />
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    aria-label="Upload profile photo"
                    onChange={handleAvatarFile}
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    disabled={uploadingAvatar || mutation.isPending}
                    className="btn-secondary inline-flex items-center gap-2 text-xs py-1.5 px-3"
                  >
                    <Upload size={14} />
                    {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                  </button>
                  <p className="text-xs text-gray-400 max-w-[220px]">
                    JPG, PNG, GIF, or WebP — max 5 MB. No photo shows initials.
                  </p>
                </div>
                <div className="flex-1 space-y-4 w-full min-w-0">
                  <Input
                    label="Full name *"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                  <Input
                    label="Phone (max 10 digits)"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => set('phone', digitsOnlyMax10(e.target.value))}
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="bg-surface-secondary rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Account (read-only)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Email</span>
                    <p className="text-gray-900 font-medium break-all">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Role</span>
                    <p className="text-gray-900 font-medium capitalize">{user.role?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Department</span>
                    <p className="text-gray-900 font-medium">{user.departmentId?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Department role</span>
                    <p className="text-gray-900 font-medium">{user.departmentRole || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-600 mb-2">Password</p>
                <p className="text-xs text-gray-500 mb-3">
                  We’ll email a secure link to <span className="font-medium text-gray-700">{user.email}</span> to set a new password.
                </p>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                  onClick={() => setResetConfirmOpen(true)}
                >
                  <Lock size={14} />
                  Change password
                </button>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2" disabled={mutation.isPending}>
                  <Save size={16} />
                  {mutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Password</h3>
          </div>
          <p className="text-sm text-gray-600 max-w-md">
            We’ll send a password reset link to your registered email{' '}
            <span className="font-medium text-gray-900 break-all">{user.email}</span>. Open the link to choose a new password.
          </p>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={() => setResetConfirmOpen(true)}
          >
            <Lock size={16} />
            Change password
          </button>
        </div>
      )}

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => !resetSending && setResetConfirmOpen(false)}
        onConfirm={sendPasswordResetLink}
        title="Send password reset link?"
        message={`We will email a secure link to ${user.email}. Use it to set a new password. Continue?`}
        confirmLabel="Send email"
        danger={false}
        loading={resetSending}
      />

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
              <span>Departments:</span><span>SEO, Meta Ads, Google Ads, Social, Web Dev, Sales, Accounts</span>
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
