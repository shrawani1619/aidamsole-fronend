import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, UserCog, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Input, PageLoader, EmptyState, Avatar, SearchInput } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import { digitsOnlyMax10, phoneToApi } from '../../utils/phone';

function CreateAdminForm({ onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
      };
      const phoneVal = phoneToApi(data.phone);
      if (phoneVal != null) payload.phone = phoneVal;
      return adminsApi.create(payload);
    },
    onSuccess: () => {
      toast.success('Administrator created');
      qc.invalidateQueries(['admins']);
      qc.invalidateQueries(['users']);
      onClose();
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        New accounts are created with the <strong>admin</strong> role. Assign a department later from <strong>Team</strong> if needed. Module access can be tuned in Permissions.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Full name *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" />
        <Input label="Email *" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="admin@company.com" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone (optional)"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={form.phone}
          onChange={(e) => set('phone', digitsOnlyMax10(e.target.value))}
          placeholder="9876543210"
        />
        <Input label="Password *" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending || !form.name || !form.email || !form.password}
        >
          {mutation.isPending ? 'Creating…' : 'Create admin'}
        </button>
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminsApi.list().then((r) => r.data),
    enabled: isSuperAdmin,
  });

  const admins = (data?.users || []).filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="card p-8 text-center text-gray-600">
        Only the super administrator can manage administrator accounts.
      </div>
    );
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <div className="page-header">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <UserCog className="text-brand-navy" size={22} />
            Administrators
          </h2>
          <p className="text-sm text-gray-500">
            Create and review <strong>admin</strong> accounts. Admins have broad CRM access; use Permissions to tune modules per person.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add admin
        </button>
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="max-w-md"
      />

      {admins.length === 0 ? (
        <EmptyState icon={UserCog} title="No administrators yet" description="Use “Add admin” to invite an admin with email and password." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary/80 text-left text-gray-600">
                  <th className="py-3 px-4 font-semibold">Admin</th>
                  <th className="py-3 px-3 font-semibold">Department</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold whitespace-nowrap">Last login</th>
                  <th className="py-3 px-4 font-semibold text-right">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar user={u} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-700">
                      {u.departmentId ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: u.departmentId.color || '#0D1B8E' }}
                        >
                          {u.departmentId.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                      {u.departmentRole && <span className="block text-xs text-gray-500 mt-1">{u.departmentRole}</span>}
                    </td>
                    <td className="py-3 px-3">
                      {u.isActive ? (
                        <span className="text-xs font-medium text-green-700">Active</span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-600 text-xs whitespace-nowrap">
                      {u.lastLogin ? formatDate(u.lastLogin, 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to="/team"
                        className="text-xs text-brand-navy hover:underline inline-flex items-center gap-1"
                        title="Edit in Team"
                      >
                        Manage in Team <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add administrator" size="lg">
        <CreateAdminForm onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
