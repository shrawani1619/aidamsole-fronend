import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Save, RotateCcw, UserPlus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, permissionsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, Select, Avatar, Modal } from '../../components/ui';
import {
  MODULE_IDS,
  MODULE_LABELS,
  ACTION_LABELS,
  DASHBOARD_FIELD_KEYS,
  DASHBOARD_FIELD_LABELS,
  REPORTS_FIELD_KEYS,
  REPORTS_FIELD_LABELS,
} from '../../constants/permissions';

function hasCustomPermissions(u) {
  const m = u?.modulePermissions;
  return m && typeof m === 'object' && Object.keys(m).length > 0;
}

function buildPayloadFromDraft(draft) {
  const out = {};
  MODULE_IDS.forEach((id) => {
    const src = draft?.[id];
    if (!src) return;
    const row = {};
    ['view', 'create', 'edit', 'delete'].forEach((a) => {
      if (typeof src[a] === 'boolean') row[a] = src[a];
    });
    if ((id === 'dashboard' || id === 'reports') && src.fields && typeof src.fields === 'object') {
      const keys = id === 'dashboard' ? DASHBOARD_FIELD_KEYS : REPORTS_FIELD_KEYS;
      const fields = {};
      keys.forEach((fk) => {
        if (typeof src.fields[fk] === 'boolean') fields[fk] = src.fields[fk];
      });
      if (Object.keys(fields).length) row.fields = fields;
    }
    if (Object.keys(row).length) out[id] = row;
  });
  return out;
}

export default function PermissionsPage() {
  const { isAdmin, user: me, updateUser } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [highlightUserId, setHighlightUserId] = useState(null);

  const closeModal = () => {
    setModalOpen(false);
    setSelectedId('');
    setDraft(null);
  };

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: isAdmin,
  });

  const users = listData?.users || [];

  const { data: schemaPayload } = useQuery({
    queryKey: ['permissions-schema'],
    queryFn: () => permissionsApi.schema().then((r) => r.data.data),
    staleTime: 60 * 60 * 1000,
    enabled: isAdmin,
  });

  const moduleLabelById = useMemo(() => {
    const m = { ...MODULE_LABELS };
    schemaPayload?.modules?.forEach((x) => {
      m[x.id] = x.label;
    });
    return m;
  }, [schemaPayload]);

  const actionLabelById = useMemo(() => {
    const m = { ...ACTION_LABELS };
    schemaPayload?.actions?.forEach((x) => {
      m[x.id] = x.label;
    });
    return m;
  }, [schemaPayload]);

  const dashboardFieldLabel = useMemo(() => {
    const m = { ...DASHBOARD_FIELD_LABELS };
    schemaPayload?.fields?.dashboard?.forEach((x) => {
      m[x.id] = x.label;
    });
    return m;
  }, [schemaPayload]);

  const reportsFieldLabel = useMemo(() => {
    const m = { ...REPORTS_FIELD_LABELS };
    schemaPayload?.fields?.reports?.forEach((x) => {
      m[x.id] = x.label;
    });
    return m;
  }, [schemaPayload]);

  const { data: permDetail, isLoading: permLoading } = useQuery({
    queryKey: ['permissions', 'user', selectedId],
    queryFn: () => permissionsApi.getUser(selectedId).then((r) => r.data.data),
    enabled: !!selectedId && isAdmin && modalOpen,
  });

  const displayUser = useMemo(
    () => users.find((u) => String(u._id) === String(selectedId)),
    [users, selectedId]
  );

  useEffect(() => {
    if (!selectedId) {
      setDraft(null);
      return;
    }
    if (permLoading) {
      setDraft(null);
      return;
    }
    if (permDetail?.effectiveModulePermissions) {
      setDraft(JSON.parse(JSON.stringify(permDetail.effectiveModulePermissions)));
    } else {
      setDraft(null);
    }
  }, [selectedId, permDetail, permLoading]);

  const saveMutation = useMutation({
    mutationFn: ({ id, modulePermissions }) => permissionsApi.updateUser(id, { modulePermissions }),
    onSuccess: (axiosRes, variables) => {
      toast.success('Permissions saved');
      const savedId = String(variables.id);
      setHighlightUserId(savedId);
      window.setTimeout(() => setHighlightUserId(null), 5000);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['permissions', 'user', variables.id] });
      const u = axiosRes.data?.user;
      if (u?._id === me?._id && u.effectiveModulePermissions) {
        updateUser({
          effectiveModulePermissions: u.effectiveModulePermissions,
          modulePermissions: u.modulePermissions,
        });
      }
      closeModal();
    },
  });

  const options = useMemo(
    () =>
      users.map((u) => ({
        value: u._id,
        label: `${u.name} (${u.email}) — ${u.role?.replace(/_/g, ' ')}`,
      })),
    [users]
  );

  const openConfigureModal = (userId) => {
    setSelectedId(userId || '');
    setModalOpen(true);
  };

  const toggleAction = (moduleId, action) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [moduleId]: { ...prev[moduleId], [action]: !prev[moduleId]?.[action] } };
      if (action === 'view' && !next[moduleId].view) {
        next[moduleId] = { ...next[moduleId], create: false, edit: false, delete: false };
      }
      return next;
    });
  };

  const toggleField = (fieldKey) => {
    setDraft((prev) => {
      if (!prev?.dashboard) return prev;
      const fields = { ...(prev.dashboard.fields || {}) };
      const cur = fields[fieldKey] !== false;
      fields[fieldKey] = !cur;
      return {
        ...prev,
        dashboard: { ...prev.dashboard, fields },
      };
    });
  };

  const toggleReportField = (fieldKey) => {
    setDraft((prev) => {
      if (!prev?.reports) return prev;
      const fields = { ...(prev.reports.fields || {}) };
      const cur = fields[fieldKey] !== false;
      fields[fieldKey] = !cur;
      return {
        ...prev,
        reports: { ...prev.reports, fields },
      };
    });
  };

  const handleSave = () => {
    if (!selectedId || !draft) return;
    if (displayUser?.role === 'super_admin' || permDetail?.role === 'super_admin') return;
    const modulePermissions = buildPayloadFromDraft(draft);
    saveMutation.mutate({ id: selectedId, modulePermissions });
  };

  const handleResetRoleDefaults = () => {
    if (displayUser?.role === 'super_admin' || permDetail?.role === 'super_admin') return;
    if (!window.confirm('Clear custom permissions for this user? They will fall back to role defaults.')) return;
    saveMutation.mutate({ id: selectedId, modulePermissions: {} });
  };

  const targetRole = permDetail?.role ?? displayUser?.role;
  const isSuperAdminTarget = targetRole === 'super_admin';

  const canSave = selectedId && draft && !isSuperAdminTarget;

  const formBody =
    selectedId && permLoading ? (
      <PageLoader />
    ) : selectedId && draft ? (
      <div className="space-y-5 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
          <Avatar user={displayUser || { name: '?', email: '' }} size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{displayUser?.name || 'User'}</p>
            <p className="text-xs text-gray-500">{displayUser?.email || '—'}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
              {(targetRole || '').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {isSuperAdminTarget && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Super admin</strong> always has full access to every module. These permissions are fixed and cannot be edited.
          </div>
        )}

        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary text-left text-gray-600">
                <th className="py-3 px-3 font-semibold">Module</th>
                {['view', 'create', 'edit', 'delete'].map((k) => (
                  <th key={k} className="py-3 px-2 font-semibold text-center w-24">
                    {actionLabelById[k] || k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MODULE_IDS.map((mid) => (
                <tr key={mid} className="hover:bg-gray-50/80">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{moduleLabelById[mid] || mid}</td>
                  {['view', 'create', 'edit', 'delete'].map((act) => (
                    <td key={act} className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                        checked={!!draft[mid]?.[act]}
                        disabled={isSuperAdminTarget || (act !== 'view' && !draft[mid]?.view)}
                        onChange={() => toggleAction(mid, act)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-100 p-4 bg-surface-secondary/50">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Dashboard — field visibility</h3>
          <p className="text-xs text-gray-500 mb-3">
            Control KPI widgets (e.g. hide <strong>MRR</strong>) when this user can view the dashboard.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DASHBOARD_FIELD_KEYS.map((fk) => (
              <label key={fk} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  checked={draft.dashboard?.fields?.[fk] !== false}
                  disabled={isSuperAdminTarget || !draft.dashboard?.view}
                  onChange={() => toggleField(fk)}
                />
                <span>{dashboardFieldLabel[fk] || fk}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 p-4 bg-surface-secondary/50">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Reports — sections</h3>
          <p className="text-xs text-gray-500 mb-3">
            Which report tabs this user sees. The Financial tab also requires <strong>Finance → View</strong> (and the API enforces it).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REPORTS_FIELD_KEYS.map((fk) => (
              <label key={fk} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  checked={draft.reports?.fields?.[fk] !== false}
                  disabled={isSuperAdminTarget || !draft.reports?.view}
                  onChange={() => toggleReportField(fk)}
                />
                <span>{reportsFieldLabel[fk] || fk}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    ) : selectedId && !permLoading && !draft ? (
      <p className="text-sm text-gray-500 py-6 text-center">Could not load permissions for this user.</p>
    ) : (
      <p className="text-sm text-gray-500 py-2">Select a team member above to load their access matrix.</p>
    );

  if (!isAdmin) {
    return (
      <div className="card p-8 text-center text-gray-600">
        Only administrators can manage module permissions.
      </div>
    );
  }

  if (listLoading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-brand-navy" size={22} />
            Module permissions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Grant view, create, edit, and delete per module, and fine-tune dashboard KPIs (such as MRR) per person.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center justify-center gap-2 shrink-0"
          onClick={() => openConfigureModal('')}
        >
          <UserPlus size={18} />
          Add permission
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-surface-secondary/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Team access overview</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              After you save, the updated person is highlighted briefly. Use <strong>Configure</strong> to edit anyone.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary/80 text-left text-gray-600">
                <th className="py-3 px-4 font-semibold">Team member</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">Role</th>
                <th className="py-3 px-3 font-semibold">Permission source</th>
                <th className="py-3 px-4 font-semibold text-right w-36">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-500 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const id = String(u._id);
                  const isHi = highlightUserId === id;
                  return (
                    <tr
                      key={id}
                      className={`transition-colors ${isHi ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : 'hover:bg-gray-50/80'}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar user={u} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{u.name}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-700 capitalize whitespace-nowrap">
                        {u.role?.replace(/_/g, ' ') || '—'}
                      </td>
                      <td className="py-3 px-3">
                        {u.role === 'super_admin' ? (
                          <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-medium">
                            Full access (fixed)
                          </span>
                        ) : hasCustomPermissions(u) ? (
                          <span className="inline-flex items-center rounded-md bg-brand-navy/10 text-brand-navy px-2 py-0.5 text-xs font-medium">
                            Custom overrides
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Role defaults</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role === 'super_admin' ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary text-xs inline-flex items-center gap-1.5"
                            onClick={() => openConfigureModal(id)}
                          >
                            <Pencil size={14} />
                            Configure
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Set permissions"
        size="xl"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              disabled={saveMutation.isPending || !selectedId || isSuperAdminTarget}
              onClick={handleResetRoleDefaults}
            >
              <RotateCcw size={16} /> Clear overrides
            </button>
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              disabled={saveMutation.isPending || !canSave}
              onClick={handleSave}
            >
              <Save size={16} /> Save permissions
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Team member</label>
            <Select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              options={[{ value: '', label: 'Choose who to configure…' }, ...options]}
            />
          </div>
          {formBody}
        </div>
      </Modal>
    </div>
  );
}
