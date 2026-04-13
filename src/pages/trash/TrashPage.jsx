import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckSquare, RotateCcw, Skull } from 'lucide-react';
import toast from 'react-hot-toast';
import { trashApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState, ConfirmDialog } from '../../components/ui';
import { formatDate, slugToLabel } from '../../utils/helpers';

export default function TrashPage() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [permTarget, setPermTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => trashApi.list().then((r) => r.data),
  });

  const users = data?.users || [];
  const tasks = data?.tasks || [];

  const invalidate = () => {
    qc.invalidateQueries(['trash']);
    qc.invalidateQueries(['users']);
    qc.invalidateQueries(['tasks']);
  };

  const restoreUserMut = useMutation({
    mutationFn: (id) => trashApi.restoreUser(id),
    onSuccess: () => {
      toast.success('User restored');
      invalidate();
    },
  });
  const restoreTaskMut = useMutation({
    mutationFn: (id) => trashApi.restoreTask(id),
    onSuccess: () => {
      toast.success('Task restored');
      invalidate();
    },
  });
  const permUserMut = useMutation({
    mutationFn: (id) => trashApi.permanentDeleteUser(id),
    onSuccess: () => {
      toast.success('User permanently deleted');
      invalidate();
      setPermTarget(null);
    },
  });
  const permTaskMut = useMutation({
    mutationFn: (id) => trashApi.permanentDeleteTask(id),
    onSuccess: () => {
      toast.success('Task permanently deleted');
      invalidate();
      setPermTarget(null);
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Trash</h2>
          <p className="text-sm text-gray-500">
            Removed team members and tasks stay here until you restore them or delete them forever.
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Users size={18} className="text-brand-navy" /> Team members ({users.length})
        </h3>
        {users.length === 0 ? (
          <EmptyState icon={Users} title="No users in trash" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Removed</th>
                  <th className="py-2 text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{u.name}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{u.email}</td>
                    <td className="py-2.5 pr-3 capitalize">{slugToLabel(u.role)}</td>
                    <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">
                      {u.deletedAt ? formatDate(u.deletedAt, 'dd MMM yyyy HH:mm') : '—'}
                    </td>
                    <td className="py-2.5 text-right space-x-2">
                      <button
                        type="button"
                        className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                        onClick={() => restoreUserMut.mutate(u._id)}
                        disabled={restoreUserMut.isPending}
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="btn-secondary py-1 px-2 text-xs text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                          onClick={() => setPermTarget({ type: 'user', id: u._id, label: u.name })}
                        >
                          <Skull size={14} /> Delete forever
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <CheckSquare size={18} className="text-brand-navy" /> Tasks ({tasks.length})
        </h3>
        {tasks.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No tasks in trash" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Project</th>
                  <th className="py-2 pr-3">Removed</th>
                  <th className="py-2 text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks.map((t) => (
                  <tr key={t._id}>
                    <td className="py-2.5 pr-3 font-medium text-gray-900 max-w-[200px] truncate">{t.title}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{t.clientId?.company || t.clientId?.name || '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{t.projectId?.title || '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">
                      {t.deletedAt ? formatDate(t.deletedAt, 'dd MMM yyyy HH:mm') : '—'}
                    </td>
                    <td className="py-2.5 text-right space-x-2">
                      <button
                        type="button"
                        className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                        onClick={() => restoreTaskMut.mutate(t._id)}
                        disabled={restoreTaskMut.isPending}
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="btn-secondary py-1 px-2 text-xs text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                          onClick={() => setPermTarget({ type: 'task', id: t._id, label: t.title })}
                        >
                          <Skull size={14} /> Delete forever
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!permTarget}
        onClose={() => setPermTarget(null)}
        onConfirm={() => {
          if (!permTarget) return;
          if (permTarget.type === 'user') permUserMut.mutate(permTarget.id);
          else permTaskMut.mutate(permTarget.id);
        }}
        loading={permUserMut.isPending || permTaskMut.isPending}
        title="Delete permanently?"
        confirmLabel="Delete forever"
        danger
        message={`This cannot be undone. Remove ${permTarget?.type === 'user' ? 'user' : 'task'} "${permTarget?.label}" from the database permanently?`}
      />
    </div>
  );
}
