import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Users, Shield, Activity, ExternalLink, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, departmentsApi, reportsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Input, Select, PageLoader, EmptyState, Avatar, SearchInput, StatCard, ConfirmDialog } from '../../components/ui';
import { formatDate, slugToLabel } from '../../utils/helpers';
import { digitsOnlyMax10, phoneToApi, phoneFieldValue } from '../../utils/phone';

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'department_manager', label: 'Department Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' }
];
const ROLE_BADGE = { super_admin: 'badge-red', admin: 'badge-purple', department_manager: 'badge-blue', employee: 'badge-gray' };

/** Rows for create/edit: [{ departmentId, role }]. */
function membershipsFromUser(u) {
  if (u?.departmentMemberships?.length) {
    return u.departmentMemberships.map((m) => ({
      departmentId: m.departmentId?._id || m.departmentId,
      role: m.role || '',
    }));
  }
  if (u?.departmentId) {
    return [{ departmentId: u.departmentId._id || u.departmentId, role: u.departmentRole || '' }];
  }
  return [];
}

/** For cards / performance: list of { dept, role } with populated dept when available. */
function departmentRowsForDisplay(u) {
  const rows = [];
  if (u?.departmentMemberships?.length) {
    u.departmentMemberships.forEach((m) => {
      const dept = m.departmentId;
      if (dept && (dept.name || dept._id)) rows.push({ dept, role: m.role || '' });
    });
    if (rows.length) return rows;
  }
  if (u?.departmentId && (u.departmentId.name || u.departmentId._id)) {
    rows.push({ dept: u.departmentId, role: u.departmentRole || '' });
  }
  return rows;
}

const PERF_RANGES = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'yearly', label: 'This year' },
];

function EmployeePerformanceModal({ user: emp, onClose }) {
  const [range, setRange] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params = {
    userId: emp._id,
    range,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employee-performance', emp._id, range, startDate, endDate],
    queryFn: () => reportsApi.teamPerformance(params).then(r => r.data.data),
    enabled: !!emp?._id,
  });

  const metrics = data?.memberMetrics;
  const summary = data?.summary;
  const recent = data?.recentTasks || [];
  const byStatus = data?.tasksByStatus || {};
  const profile = data?.employee;
  const rangeLabel = data?.range
    ? `${new Date(data.range.start).toLocaleDateString()} – ${new Date(data.range.end).toLocaleDateString()}`
    : '';

  return (
    <Modal open={!!emp} onClose={onClose} title={`Performance — ${emp.name}`} size="lg">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-2">
          {PERF_RANGES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r.value ? 'bg-brand-navy text-white' : 'bg-surface-secondary text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input text-xs w-36" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-xs w-36" />
        </div>
        <p className="text-xs text-gray-500">{rangeLabel}</p>

        {isError && (
          <p className="text-sm text-red-600">{error?.response?.data?.message || error?.message || 'Could not load performance.'}</p>
        )}

        {isLoading && <p className="text-sm text-gray-500">Loading performance…</p>}

        {!isLoading && !isError && data && (
          <>
            <div className="flex flex-wrap gap-4 p-4 bg-surface-secondary rounded-xl">
              <Avatar user={profile || emp} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{profile?.name || emp.name}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.email || emp.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(profile?.role || emp.role) && (
                    <span className={`text-xs ${ROLE_BADGE[profile?.role || emp.role] || 'badge-gray'}`}>
                      {slugToLabel(profile?.role || emp.role)}
                    </span>
                  )}
                  {departmentRowsForDisplay(profile || emp).map(({ dept, role }, i) => (
                    <React.Fragment key={dept?._id || i}>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: dept?.color || '#0D1B8E' }}
                      >
                        {dept?.name || '—'}
                      </span>
                      {role ? <span className="badge-gray">{role}</span> : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Tasks (period)" value={summary?.totalTasks ?? 0} icon={Activity} />
              <StatCard label="Completed" value={summary?.completedTasks ?? 0} color="text-green-600" />
              <StatCard label="Delayed" value={summary?.delayedTasks ?? 0} color="text-amber-600" />
              <StatCard label="Hours logged" value={summary?.totalHoursLogged ?? '0'} />
            </div>

            {metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Completion rate" value={`${metrics.completionRate ?? 0}%`} />
                <StatCard label="On-time rate" value={`${metrics.onTimeRate ?? 0}%`} />
                <StatCard label="Productivity score" value={metrics.productivityScore ?? 0} />
                <StatCard label="Projects touched" value={data.distinctProjectCount ?? 0} />
              </div>
            )}

            {!metrics && summary && (
              <p className="text-xs text-gray-500">
                No tasks assigned in this period — metrics appear when the employee has work in the selected range.
              </p>
            )}

            {Object.keys(byStatus).length > 0 && (
              <div className="card">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Tasks by status</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byStatus).map(([st, n]) => (
                    <span key={st} className="text-xs px-2 py-1 rounded-lg bg-surface-secondary text-gray-700">
                      {slugToLabel(st)}: <strong>{n}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-700">Recent tasks (up to 50)</h4>
                <Link to="/tasks" className="text-xs text-brand-navy hover:underline flex items-center gap-0.5" onClick={onClose}>
                  Open tasks <ExternalLink size={12} />
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-xs text-gray-500">No tasks in this date range.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-secondary text-left text-gray-500">
                        <th className="py-2 px-2">Task</th>
                        <th className="py-2 px-2">Client</th>
                        <th className="py-2 px-2">Project</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Due</th>
                        <th className="py-2 px-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recent.map(t => (
                        <tr key={t._id} className="hover:bg-surface-secondary/50">
                          <td className="py-2 px-2 font-medium text-gray-800 max-w-[140px] truncate">{t.title}</td>
                          <td className="py-2 px-2 text-gray-600 max-w-[100px] truncate">{t.clientId?.company || t.clientId?.name || '—'}</td>
                          <td className="py-2 px-2 text-gray-600 max-w-[100px] truncate">{t.projectId?.title || '—'}</td>
                          <td className="py-2 px-2">
                            <span className={t.isDelayed ? 'text-amber-600' : ''}>{slugToLabel(t.status)}</span>
                          </td>
                          <td className="py-2 px-2 text-gray-500 whitespace-nowrap">
                            {t.dueDate ? formatDate(t.dueDate, 'dd MMM yyyy') : '—'}
                          </td>
                          <td className="py-2 px-1">
                            <Link to={`/tasks/${t._id}`} className="text-brand-navy hover:underline p-1 inline-flex" onClick={onClose} title="Open task">
                              <ExternalLink size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function UserForm({ onClose, existing }) {
  const qc = useQueryClient();
  const { data: dData } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list().then(r => r.data) });
  const departments = dData?.departments || [];
  const [form, setForm] = useState({
    name: existing?.name || '', email: existing?.email || '', phone: phoneFieldValue(existing?.phone),
    password: '', isActive: existing?.isActive ?? true,
  });
  const [memberships, setMemberships] = useState(() => membershipsFromUser(existing));
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleDepartment = (deptId) => {
    const id = String(deptId);
    setMemberships((prev) => {
      const i = prev.findIndex((m) => String(m.departmentId) === id);
      if (i >= 0) return prev.filter((_, j) => j !== i);
      return [...prev, { departmentId: deptId, role: '' }];
    });
  };

  const setRoleForDepartment = (deptId, role) => {
    setMemberships((prev) =>
      prev.map((m) => (String(m.departmentId) === String(deptId) ? { ...m, role } : m))
    );
  };

  const roleOptionsForDept = (dept) => {
    const raw = dept?.roles;
    const deptRoles = Array.isArray(raw) ? raw.map(String).map((s) => s.trim()).filter(Boolean) : [];
    return deptRoles;
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        name: data.name,
        email: data.email,
        phone: phoneToApi(data.phone),
        role: existing ? existing.role : 'employee',
        departmentMemberships: memberships.filter((m) => m.departmentId),
        isActive: data.isActive,
      };
      if (data.password) payload.password = data.password;
      if (!payload.password) delete payload.password;
      return existing ? usersApi.update(existing._id, payload) : usersApi.create(payload);
    },
    onSuccess: () => { toast.success(existing ? 'User updated' : 'User created'); qc.invalidateQueries(['users']); qc.invalidateQueries(['departments']); onClose(); }
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Priya Patel" />
        <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="priya@aidamsole.com" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Phone" type="tel" inputMode="numeric" maxLength={10}
          value={form.phone} onChange={e => set('phone', digitsOnlyMax10(e.target.value))} placeholder="9876543210" />
        <Input label={existing ? 'New Password (optional)' : 'Password *'} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Departments &amp; roles</p>
        <p className="text-xs text-gray-500 mb-3">Select one or more departments and set this member&apos;s role in each.</p>
        <div className="max-h-56 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-3 bg-surface-secondary/50">
          {departments.length === 0 ? (
            <p className="text-sm text-gray-500">No departments yet. Create departments first.</p>
          ) : (
            departments.map((d) => {
              const checked = memberships.some((m) => String(m.departmentId) === String(d._id));
              const row = memberships.find((m) => String(m.departmentId) === String(d._id));
              const deptRoles = roleOptionsForDept(d);
              return (
                <div key={d._id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                  <label className="flex items-center gap-2 min-w-0 sm:w-[42%] cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                      checked={checked}
                      onChange={() => toggleDepartment(d._id)}
                    />
                    <span className="text-sm font-medium text-gray-800 truncate">{d.name}</span>
                  </label>
                  {checked && (
                    deptRoles.length > 0 ? (
                      <Select
                        label=""
                        value={row?.role || ''}
                        onChange={(e) => setRoleForDepartment(d._id, e.target.value)}
                        options={[
                          { value: '', label: 'Role in this dept…' },
                          ...deptRoles.map((r) => ({ value: r, label: r })),
                          ...(row?.role && !deptRoles.includes(row.role) ? [{ value: row.role, label: `${row.role} (saved)` }] : []),
                        ]}
                      />
                    ) : (
                      <Input
                        label=""
                        value={row?.role || ''}
                        onChange={(e) => setRoleForDepartment(d._id, e.target.value)}
                        placeholder="e.g. SEO Executive"
                      />
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      {existing && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Select label="Status" value={form.isActive} onChange={e => set('isActive', e.target.value === 'true')}
            options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name || !form.email || (!existing && !form.password)}>
          {mutation.isPending ? 'Saving...' : existing ? 'Update User' : 'Create User'}
        </button>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user: me, isAdmin, isSuperAdmin, canModule } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [trashTarget, setTrashTarget] = useState(null);
  const [performanceUser, setPerformanceUser] = useState(null);

  const { data: uData, isLoading } = useQuery({
    queryKey: ['users', { deptFilter, roleFilter }],
    queryFn: () => usersApi.list({ department: deptFilter, role: roleFilter }).then(r => r.data),
  });
  const { data: dData } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list().then(r => r.data) });
  const departments = dData?.departments || [];
  const users = (uData?.users || []).filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const trashMutation = useMutation({
    mutationFn: () => usersApi.trash(trashTarget._id),
    onSuccess: () => {
      toast.success('User moved to trash');
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['trash']);
      setTrashTarget(null);
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Team</h2>
          <p className="text-sm text-gray-500">{users.length} team members</p>
        </div>
        {canModule('team', 'create') && (
          <button className="btn-primary" onClick={() => { setEditUser(null); setModalOpen(true); }}>
            <Plus size={16} /> Add Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={users.length} icon={Users} />
        <StatCard label="Managers" value={users.filter(u => u.role === 'department_manager').length} />
        <StatCard label="Active" value={users.filter(u => u.isActive).length} color="text-green-600" />
        <StatCard label="Departments" value={departments.length} icon={Shield} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team members..." className="flex-1" />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input w-full sm:w-40">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-full sm:w-40">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No team members found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map(u => (
            <div
              key={u._id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if (e.target.closest('button')) return;
                setPerformanceUser(u);
              }}
              onKeyDown={(e) => {
                if (e.target.closest('button')) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPerformanceUser(u);
                }
              }}
              className={`card hover:shadow-card-hover transition-shadow text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-navy/30 ${!u.isActive ? 'opacity-60' : ''}`}
            >
              <p className="text-[10px] uppercase tracking-wide text-brand-navy font-semibold mb-2">Click for performance</p>
              <div className="flex items-start gap-3">
                <Avatar user={u} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs flex-shrink-0 ${ROLE_BADGE[u.role] || 'badge-gray'}`}>
                      {slugToLabel(u.role)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {departmentRowsForDisplay(u).map(({ dept, role }, i) => (
                      <React.Fragment key={dept?._id || i}>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: dept?.color || '#0D1B8E' }}
                        >
                          {dept?.name || '—'}
                        </span>
                        {role ? <span className="badge-gray">{role}</span> : null}
                      </React.Fragment>
                    ))}
                    {!u.isActive && <span className="badge-red">Inactive</span>}
                  </div>
                  {u.lastLogin && (
                    <p className="text-xs text-gray-400 mt-2">Last login: {formatDate(u.lastLogin, 'dd MMM yyyy')}</p>
                  )}
                </div>
              </div>
              {(isAdmin || isSuperAdmin) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => { setEditUser(u); setModalOpen(true); }} className="btn-secondary flex-1 min-w-[4rem] py-1.5 text-xs justify-center">Edit</button>
                  {isSuperAdmin &&
                    u.isActive &&
                    String(u._id) !== String(me?._id) &&
                    u.role !== 'super_admin' && (
                      <button
                        type="button"
                        onClick={() => setTrashTarget(u)}
                        className="btn-secondary py-1.5 px-3 text-xs text-amber-700 hover:bg-amber-50 inline-flex items-center gap-1"
                        title="Remove from team and move to Trash"
                      >
                        <Archive size={14} /> Move to trash
                      </button>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditUser(null); }}
        title={editUser ? `Edit — ${editUser.name}` : 'Add Team Member'}>
        <UserForm key={editUser?._id || 'new'} onClose={() => { setModalOpen(false); setEditUser(null); }} existing={editUser} />
      </Modal>
      <ConfirmDialog open={!!trashTarget} onClose={() => setTrashTarget(null)}
        onConfirm={() => trashMutation.mutate()} loading={trashMutation.isPending}
        title="Move to trash" confirmLabel="Move to trash" danger
        message={`Move "${trashTarget?.name}" to trash? They will lose access immediately. You can restore them from Trash or delete permanently later.`} />

      {performanceUser && (
        <EmployeePerformanceModal user={performanceUser} onClose={() => setPerformanceUser(null)} />
      )}
    </div>
  );
}
