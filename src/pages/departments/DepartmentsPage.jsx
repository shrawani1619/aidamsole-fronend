import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, UserPlus, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { departmentsApi, usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Input, Select, PageLoader, EmptyState, Avatar, StatCard, ConfirmDialog } from '../../components/ui';

/** Preset brand colors when the typed name matches a common department */
const DEPT_COLORS = { SEO: '#10B981', 'Paid Ads': '#3B82F6', 'Social Media': '#8B5CF6', 'Web Dev': '#F59E0B', Sales: '#EF4444', Accounts: '#6B7280' };

/** Max members shown on each department card; rest via "View all". */
const MEMBERS_CARD_PREVIEW = 2;

function memberRoleInDept(m, deptId) {
  const id = String(deptId);
  const row = (m.departmentMemberships || []).find(
    (x) => String(x.departmentId?._id || x.departmentId) === id
  );
  if (row?.role) return row.role;
  if (String(m.departmentId?._id || m.departmentId) === id) return m.departmentRole;
  return m.departmentRole || '';
}

/** Populated users or legacy single headId */
function departmentHeadsList(dept) {
  if (dept.headIds?.length) return dept.headIds.filter(Boolean);
  if (dept.headId) return [dept.headId];
  return [];
}

function departmentHeadIdSet(dept) {
  return new Set(departmentHeadsList(dept).map((h) => String(h._id || h)));
}

function DeptForm({ onClose, existing }) {
  const qc = useQueryClient();
  const { data: uData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list().then(r => r.data) });
  const users = uData?.users || [];

  const [form, setForm] = useState({
    name:        existing?.name        || '',
    description: existing?.description || '',
    headIds:     existing?.headIds?.length
      ? existing.headIds.map((h) => h._id || h)
      : existing?.headId
        ? [existing.headId._id || existing.headId]
        : [],
    color:       existing?.color       || '#0D1B8E',
    roles:       Array.isArray(existing?.roles) && existing.roles.length ? [...existing.roles] : []
  });
  const [roleDraft, setRoleDraft] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleNameChange = (value) => {
    const name = value;
    const preset = DEPT_COLORS[name.trim()];
    setForm((p) => ({
      ...p,
      name,
      ...(preset ? { color: preset } : {})
    }));
  };

  const addRoleFromDraft = () => {
    const t = roleDraft.trim();
    if (!t) return;
    setForm((p) => ({ ...p, roles: [...p.roles, t] }));
    setRoleDraft('');
  };
  const setRoleAt = (index, value) => setForm(p => ({
    ...p,
    roles: p.roles.map((r, i) => (i === index ? value : r))
  }));
  const removeRoleAt = (index) => setForm((p) => ({
    ...p,
    roles: p.roles.filter((_, i) => i !== index)
  }));

  const toggleHead = (userId) => {
    const id = String(userId);
    setForm((p) => {
      const cur = p.headIds || [];
      const has = cur.map(String).includes(id);
      return {
        ...p,
        headIds: has ? cur.filter((x) => String(x) !== id) : [...cur, userId],
      };
    });
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      const roles = (data.roles || []).map((r) => String(r).trim()).filter(Boolean);
      const { headIds, ...rest } = data;
      const payload = {
        ...rest,
        name: String(data.name || '').trim(),
        roles,
        headIds: Array.isArray(headIds) ? headIds : [],
      };
      return existing ? departmentsApi.update(existing._id, payload) : departmentsApi.create(payload);
    },
    onSuccess:  ()   => { toast.success(existing ? 'Updated' : 'Department created'); qc.invalidateQueries(['departments']); onClose(); }
  });

  return (
    <div className="space-y-4">
      <Input label="Department Name *" value={form.name} onChange={(e) => handleNameChange(e.target.value)}
        placeholder="e.g. SEO, Paid Ads, or a custom name" />
      <div>
        <label className="label">Roles</label>
        <div className="flex gap-2 items-end">
          <Input
            label=""
            className="flex-1"
            value={roleDraft}
            onChange={(e) => setRoleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRoleFromDraft();
              }
            }}
            placeholder="e.g. SEO Executive, Content Writer"
          />
          <button type="button" onClick={addRoleFromDraft} className="btn-primary py-2 px-3 text-sm shrink-0 whitespace-nowrap">
            <Plus size={14} /> Add role
          </button>
        </div>
        {form.roles.length > 0 && (
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Added roles</p>
            {form.roles.map((role, i) => (
              <div key={`${i}-${role}`} className="flex gap-2 items-end">
                <Input
                  label=""
                  className="flex-1"
                  value={role}
                  onChange={(e) => setRoleAt(i, e.target.value)}
                  placeholder="Role name"
                />
                <button type="button" onClick={() => removeRoleAt(i)} className="btn-secondary py-2 px-2 text-xs text-red-600 border-red-100 hover:bg-red-50 shrink-0" title="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Input label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short overview..." />
      <div>
        <p className="label">Department heads</p>
        <p className="text-xs text-gray-500 mb-2">Select one or more people as head of this department.</p>
        <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-3 bg-surface-secondary/50">
          {users.length === 0 ? (
            <p className="text-sm text-gray-500">No users in team list yet.</p>
          ) : (
            users.map((u) => (
              <label key={u._id} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                  checked={(form.headIds || []).map(String).includes(String(u._id))}
                  onChange={() => toggleHead(u._id)}
                />
                <span className="text-gray-800">{u.name}</span>
                <span className="text-gray-400 text-xs truncate">{u.email}</span>
              </label>
            ))
          )}
        </div>
      </div>
      <div>
        <label className="label">Brand Color</label>
        <div className="flex items-center gap-3 mt-1">
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
          <span className="text-xs font-mono text-gray-500">{form.color}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? 'Saving...' : existing ? 'Update' : 'Create Department'}
        </button>
      </div>
    </div>
  );
}

function AddMemberModal({ dept, onClose }) {
  const qc = useQueryClient();
  const { data: uData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list().then(r => r.data) });
  const existingIds = dept.members?.map(m => String(m._id)) || [];
  const users = (uData?.users || []).filter(u => !existingIds.includes(String(u._id)));

  const [userId,   setUserId]   = useState('');
  const [deptRole, setDeptRole] = useState('');

  const deptRoles = useMemo(() => {
    const raw = dept?.roles;
    return Array.isArray(raw) ? raw.map(String).map((s) => s.trim()).filter(Boolean) : [];
  }, [dept?.roles]);

  const roleSelectOptions = useMemo(() => {
    const opts = deptRoles.map((r) => ({ value: r, label: r }));
    if (deptRole && !deptRoles.includes(deptRole)) {
      opts.unshift({ value: deptRole, label: `${deptRole} (custom)` });
    }
    return [{ value: '', label: 'Select role…' }, ...opts];
  }, [deptRoles, deptRole]);

  const mutation = useMutation({
    mutationFn: () => departmentsApi.addMember(dept._id, { userId, departmentRole: deptRole }),
    onSuccess:  () => { toast.success('Member added'); qc.invalidateQueries(['departments']); onClose(); }
  });

  return (
    <div className="space-y-4">
      <Select label="Select User" value={userId} onChange={e => setUserId(e.target.value)}
        options={[{ value: '', label: 'Select user...' }, ...users.map(u => ({ value: u._id, label: `${u.name} (${u.email})` }))]} />
      {deptRoles.length > 0 ? (
        <Select
          label="Role in Department"
          value={deptRole}
          onChange={(e) => setDeptRole(e.target.value)}
          options={roleSelectOptions}
        />
      ) : (
        <Input
          label="Role in Department"
          value={deptRole}
          onChange={(e) => setDeptRole(e.target.value)}
          placeholder="e.g. SEO Executive, Content Writer"
        />
      )}
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          onClick={() => mutation.mutate()}
          disabled={!userId || mutation.isPending || (deptRoles.length > 0 && !deptRole)}
        >
          {mutation.isPending ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  // canManage comes from AuthContext — super_admin + admin + dept_manager
  const { canManage } = useAuth();
  const qc = useQueryClient();
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editDept,      setEditDept]      = useState(null);
  const [addMemberDept, setAddMemberDept] = useState(null);
  const [removeMember,  setRemoveMember]  = useState(null);
  const [viewAllDeptId, setViewAllDeptId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn:  () => departmentsApi.list().then(r => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: () => departmentsApi.removeMember(removeMember.deptId, removeMember.userId),
    onSuccess:  () => { toast.success('Member removed'); qc.invalidateQueries(['departments']); setRemoveMember(null); }
  });

  const departments = data?.departments || [];
  const viewAllDept = departments.find((d) => String(d._id) === String(viewAllDeptId)) || null;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Departments</h2>
          <p className="text-sm text-gray-500">{departments.length} departments · RBAC enforced</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button className="btn-primary" onClick={() => { setEditDept(null); setModalOpen(true); }}>
              <Plus size={16} /> Add Dept
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Departments" value={departments.length} icon={Building2} />
        <StatCard label="Total Members" value={departments.reduce((s, d) => s + (d.members?.length || 0), 0)} icon={Users} />
        <StatCard label="Active" value={departments.filter(d => d.isActive).length} color="text-green-600" />
      </div>

      {departments.length === 0 ? (
        <EmptyState icon={Building2} title="No departments" description="Create your first department to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {departments.map(dept => (
            <div key={dept._id} className="card hover:shadow-card-hover transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: dept.color || '#0D1B8E' }}>
                    {dept.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{dept.name}</h3>
                    {dept.description && <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>}
                    {dept.roles?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {dept.roles.map((r, ri) => (
                          <span key={`${r}-${ri}`} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary text-gray-600 font-medium">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => { setEditDept(dept); setModalOpen(true); }}
                    className="text-xs text-brand-navy hover:underline font-medium">Edit</button>
                )}
              </div>

              {/* Heads */}
              {departmentHeadsList(dept).length > 0 && (
                <div className="mb-3 p-2.5 bg-surface-secondary rounded-xl space-y-2">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Department heads</p>
                  <div className="flex flex-col gap-2">
                    {departmentHeadsList(dept).map((h) => (
                      <div key={h._id} className="flex items-center gap-2">
                        <Avatar user={h} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{h.name}</p>
                          <p className="text-xs text-gray-400">Head</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">{dept.members?.length || 0} Members</p>
                  {canManage && (
                    <button onClick={() => setAddMemberDept(dept)}
                      className="flex items-center gap-1 text-xs text-brand-navy hover:underline font-medium">
                      <UserPlus size={11} /> Add
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 pr-1">
                  {dept.members?.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">No members yet</p>
                  )}
                  {(dept.members || []).slice(0, MEMBERS_CARD_PREVIEW).map((m) => (
                    <div key={m._id} className="flex items-center justify-between group py-0.5">
                      <div className="flex items-center gap-2">
                        <Avatar user={m} size="xs" />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{m.name}</p>
                          <p className="text-xs text-gray-400">
                            {memberRoleInDept(m, dept._id) || m.role?.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      {canManage && !departmentHeadIdSet(dept).has(String(m._id)) && (
                        <button
                          onClick={() => setRemoveMember({ deptId: dept._id, userId: m._id, name: m.name })}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded">
                          <UserMinus size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(dept.members?.length || 0) > MEMBERS_CARD_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setViewAllDeptId(dept._id)}
                      className="w-full text-left text-xs font-medium text-brand-navy hover:underline pt-1.5"
                    >
                      View all {dept.members.length} members
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Members only see <span className="font-medium text-gray-600">{dept.name}</span> data
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditDept(null); }}
        title={editDept ? `Edit — ${editDept.name}` : 'Add Department'}>
        <DeptForm key={editDept?._id || 'new-dept'} onClose={() => { setModalOpen(false); setEditDept(null); }} existing={editDept} />
      </Modal>

      <Modal open={!!addMemberDept} onClose={() => setAddMemberDept(null)}
        title={`Add Member to ${addMemberDept?.name}`}>
        {addMemberDept && (
          <AddMemberModal key={addMemberDept._id} dept={addMemberDept} onClose={() => setAddMemberDept(null)} />
        )}
      </Modal>

      <Modal
        open={!!viewAllDept}
        onClose={() => setViewAllDeptId(null)}
        title={viewAllDept ? `Members — ${viewAllDept.name}` : 'Members'}
        size="md"
      >
        {viewAllDept && (
          <div className="space-y-1.5 max-h-[min(60vh,420px)] overflow-y-auto pr-1">
            {(viewAllDept.members || []).map((m) => (
              <div key={m._id} className="flex items-center justify-between group py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar user={m} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">
                      {memberRoleInDept(m, viewAllDept._id) || m.role?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                {canManage && !departmentHeadIdSet(viewAllDept).has(String(m._id)) && (
                  <button
                    type="button"
                    onClick={() =>
                      setRemoveMember({ deptId: viewAllDept._id, userId: m._id, name: m.name })
                    }
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded shrink-0"
                    title="Remove from department"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!removeMember} onClose={() => setRemoveMember(null)}
        onConfirm={() => removeMutation.mutate()} loading={removeMutation.isPending}
        title="Remove Member" confirmLabel="Remove" danger
        message={`Remove "${removeMember?.name}" from this department?`} />
    </div>
  );
}
