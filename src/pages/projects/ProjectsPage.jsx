import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Calendar, Users, ChevronDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi, clientsApi, departmentsApi, usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Input, Select, Textarea, SearchInput, PageLoader, EmptyState, ProgressBar, StatCard } from '../../components/ui';
import { formatDate, statusColors, priorityColors, slugToLabel, formatINR, isOverdue } from '../../utils/helpers';

const STATUS_OPTS = [
  { value: '', label: 'All' }, { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' }, { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }
];
const PRIORITY_OPTS = [
  { value: '', label: 'All Priority' }, { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }
];
const SERVICE_OPTS = ['SEO', 'Paid Ads', 'Social Media', 'Web Dev', 'Email Marketing', 'Content', 'Other'];

function normalizeServicesFromProject(s) {
  if (Array.isArray(s) && s.length) return s;
  if (typeof s === 'string' && s) return [s];
  return ['SEO'];
}

function formatProjectServices(s, serviceOtherDetail) {
  const list = normalizeServicesFromProject(s);
  const detail = typeof serviceOtherDetail === 'string' ? serviceOtherDetail.trim() : '';
  const parts = list.map((x) => {
    if (x === 'Other' && detail) return `Other (${detail})`;
    return x;
  });
  return parts.join(', ');
}

function projectStatusLabel(status) {
  if (status === 'on_hold') return 'Inactive';
  return slugToLabel(status);
}

function ProjectForm({ onClose, existing }) {
  const { canManage } = useAuth();
  const qc = useQueryClient();
  const { data: cData } = useQuery({ queryKey: ['clients-all'], queryFn: () => clientsApi.list({ limit: 100 }).then(r => r.data) });
  const { data: dData } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list().then(r => r.data) });
  const { data: uData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list().then(r => r.data) });
  const clients = cData?.clients || [];
  const departments = dData?.departments || [];
  const users = uData?.users || [];

  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceMenuPos, setServiceMenuPos] = useState(null);
  const serviceTriggerRef = useRef(null);
  const servicePanelRef = useRef(null);

  const [form, setForm] = useState({
    title: existing?.title || '', description: existing?.description || '',
    clientId: existing?.clientId?._id || '', departmentId: existing?.departmentId?._id || '',
    managerId: existing?.managerId?._id || '', service: normalizeServicesFromProject(existing?.service),
    serviceOtherDetail: existing?.serviceOtherDetail || '',
    status: existing?.status || 'planning', priority: existing?.priority || 'medium',
    startDate: existing?.startDate ? existing.startDate.slice(0, 10) : '',
    dueDate: existing?.dueDate ? existing.dueDate.slice(0, 10) : '',
    budget: existing?.budget || '', team: existing?.team?.map(t => t._id) || []
  });

  const updateServiceMenuPos = () => {
    const el = serviceTriggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setServiceMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  useEffect(() => {
    const closeOnOutside = (e) => {
      const inTrigger = serviceTriggerRef.current?.contains(e.target);
      const inPanel = servicePanelRef.current?.contains(e.target);
      if (!inTrigger && !inPanel) setServiceDropdownOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  useEffect(() => {
    if (!serviceDropdownOpen) return;
    updateServiceMenuPos();
    const onMove = () => updateServiceMenuPos();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [serviceDropdownOpen]);

  useEffect(() => {
    if (!serviceDropdownOpen) return;
    requestAnimationFrame(() => updateServiceMenuPos());
  }, [form.service, serviceDropdownOpen]);

  // New project: when client is chosen and budget is still empty, prefill from that client’s monthly contract (MCV).
  useEffect(() => {
    if (existing) return;
    if (!form.clientId || !clients.length) return;
    const c = clients.find((x) => String(x._id) === String(form.clientId));
    if (!c || c.contractValue == null || c.contractValue === '') return;
    setForm((p) => {
      const unset = p.budget === '' || p.budget == null;
      if (!unset) return p;
      return { ...p, budget: c.contractValue };
    });
  }, [form.clientId, existing, clients]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleTeam = (id) => set('team', form.team.includes(id) ? form.team.filter(i => i !== id) : [...form.team, id]);
  const toggleService = (svc) => {
    setForm((p) => {
      const has = p.service.includes(svc);
      if (has && p.service.length === 1) {
        toast.error('Keep at least one service selected');
        return p;
      }
      const next = has ? p.service.filter((x) => x !== svc) : [...p.service, svc];
      return {
        ...p,
        service: next,
        ...(svc === 'Other' && has ? { serviceOtherDetail: '' } : {}),
      };
    });
  };

  const mutation = useMutation({
    mutationFn: (data) => existing ? projectsApi.update(existing._id, data) : projectsApi.create(data),
    onSuccess: () => { toast.success(existing ? 'Project updated' : 'Project created'); qc.invalidateQueries(['projects']); onClose(); }
  });

  const submit = () => {
    if (!form.service?.length) {
      toast.error('Select at least one service');
      return;
    }
    if (form.service.includes('Other') && !form.serviceOtherDetail?.trim()) {
      toast.error('Please describe the other service');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <Input label="Project Title *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="TechVista SEO Campaign Q4" />
      <Textarea label="Description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Client *" value={form.clientId} onChange={e => set('clientId', e.target.value)}
          options={[{ value: '', label: 'Select client...' }, ...clients.map(c => ({ value: c._id, label: c.company }))]} />
        <Select label="Department *" value={form.departmentId} onChange={e => set('departmentId', e.target.value)}
          options={[{ value: '', label: 'Select dept...' }, ...departments.map(d => ({ value: d._id, label: d.name }))]} />
      </div>
      <div className="relative">
        <label className="label">Services *</label>
        <p className="text-xs text-gray-500 mb-1.5">Open the list and tick all that apply.</p>
        <button
          ref={serviceTriggerRef}
          type="button"
          onClick={() => {
            if (serviceDropdownOpen) {
              setServiceDropdownOpen(false);
              return;
            }
            if (serviceTriggerRef.current) {
              const r = serviceTriggerRef.current.getBoundingClientRect();
              setServiceMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
            }
            setServiceDropdownOpen(true);
          }}
          className="input w-full flex items-center justify-between gap-2 text-left min-h-[42px] py-2"
          aria-expanded={serviceDropdownOpen}
          aria-haspopup="listbox"
        >
          <span className={`truncate ${form.service.length ? 'text-gray-900' : 'text-gray-400'}`}>
            {form.service.length
              ? formatProjectServices(form.service, form.serviceOtherDetail)
              : 'Select services...'}
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-400 flex-shrink-0 transition-transform ${serviceDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {serviceDropdownOpen &&
          serviceMenuPos &&
          createPortal(
            <div
              ref={servicePanelRef}
              className="fixed z-[200] flex max-h-[min(22rem,calc(100vh-6rem))] flex-col rounded-lg border border-gray-200 bg-white shadow-lg"
              style={{
                top: serviceMenuPos.top,
                left: serviceMenuPos.left,
                width: Math.max(serviceMenuPos.width, 220),
              }}
              role="listbox"
            >
              <div className="min-h-0 flex-1 overflow-y-auto py-1">
                {SERVICE_OPTS.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm text-gray-800 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.service.includes(s)}
                      onChange={() => toggleService(s)}
                      className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
              {form.service.includes('Other') && (
                <div className="shrink-0 border-t border-gray-100 bg-surface-secondary/90 px-3 py-2.5">
                  <label className="text-xs font-medium text-gray-700">Describe other service *</label>
                  <input
                    type="text"
                    value={form.serviceOtherDetail}
                    onChange={(e) => set('serviceOtherDetail', e.target.value)}
                    placeholder="e.g. Influencer marketing, PR, Podcast ads"
                    maxLength={200}
                    className="input mt-1.5 w-full text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.serviceOtherDetail?.length || 0}/200</p>
                </div>
              )}
            </div>,
            document.body
          )}
      </div>
      <Select label="Project Manager" value={form.managerId} onChange={e => set('managerId', e.target.value)}
        options={[{ value: '', label: 'Select PM...' }, ...users.map(u => ({ value: u._id, label: u.name }))]} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={STATUS_OPTS.slice(1).map(o => ({ value: o.value, label: o.label }))} />
        <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}
          options={PRIORITY_OPTS.slice(1).map(o => ({ value: o.value, label: o.label }))} />
      </div>
      <div className={`grid gap-4 ${canManage ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Input label="Start Date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        <Input label="Due Date" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        {canManage && (
          <div>
            <Input label="Project budget (₹)" type="number" value={form.budget} onChange={e => set('budget', e.target.value)} />
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Planned spend for this project (vs client retainer). Pre-filled from the client’s monthly contract when you pick a client—edit if this engagement uses a different slice.
            </p>
          </div>
        )}
      </div>
      <div>
        <label className="label">Team Members</label>
        <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto">
          {users.map(u => (
            <button key={u._id} type="button" onClick={() => toggleTeam(u._id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.team.includes(u._id) ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-200 text-gray-600 hover:border-brand-navy'
              }`}>{u.name}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : existing ? 'Update' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { canManage, canModule } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status, priority }],
    queryFn: () => projectsApi.list({ search, status, priority, limit: 30 }).then(r => r.data),
  });

  const projects = data?.projects || [];
  const canToggleProject = canModule('projects', 'edit');

  const statusToggleMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }) => projectsApi.update(id, { status: nextStatus }),
    onSuccess: () => {
      toast.success('Project status updated');
      qc.invalidateQueries(['projects']);
    },
  });

  const statusClass = { planning: 'badge-purple', active: 'badge-green', on_hold: 'badge-amber', completed: 'badge-blue', cancelled: 'badge-gray' };
  const priorityClass = { critical: 'badge-red', high: 'badge-amber', medium: 'badge-blue', low: 'badge-gray' };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="text-sm text-gray-500">{projects.length} projects</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditProject(null); setModalOpen(true); }}>
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['active', 'planning', 'completed', 'on_hold'].map(s => (
          <StatCard key={s} label={slugToLabel(s)} value={projects.filter(p => p.status === s).length}
            color={s === 'active' ? 'text-green-600' : s === 'on_hold' ? 'text-amber-600' : 'text-gray-900'} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="flex-1" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="input w-full sm:w-36">
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="input w-full sm:w-36">
          {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Project cards grid */}
      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects found" description="Create your first project to get started" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => {
            const overdue = p.dueDate && p.status !== 'completed' && isOverdue(p.dueDate);
            return (
              <div key={p._id} className="card hover:shadow-card-hover transition-shadow group">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs ${statusClass[p.status] || 'badge-gray'}`}>{projectStatusLabel(p.status)}</span>
                      {p.status !== 'on_hold' && (
                        <>
                          <span className={`text-xs ${priorityClass[p.priority] || 'badge-gray'}`}>{p.priority}</span>
                          {overdue && <span className="badge-red text-xs">Overdue</span>}
                        </>
                      )}
                    </div>
                    <Link to={`/projects/${p._id}`}>
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-navy truncate">{p.title}</h3>
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{p.clientId?.company} · <span className="text-brand-navy">{formatProjectServices(p.service, p.serviceOtherDetail)}</span></p>
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ml-2"
                    style={{ backgroundColor: p.departmentId?.color || '#0D1B8E' }}>
                    {p.departmentId?.name?.slice(0, 2) || '??'}
                  </div>
                </div>

                {/* Progress */}
                <ProgressBar value={p.progress || 0} showLabel={true} className="mb-3" />

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={11} />
                    {p.dueDate ? <span className={overdue ? 'text-red-500 font-medium' : ''}>{formatDate(p.dueDate)}</span> : '—'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={11} />
                    <span>{p.team?.length || 0} members</span>
                  </div>
                  {canManage && p.budget > 0 && (
                    <span className="font-medium text-gray-700">{formatINR(p.budget)}</span>
                  )}
                </div>

                {/* Team avatars + actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                  {p.team?.length > 0 ? (
                    <>
                    {p.team.slice(0, 4).map(m => (
                      <div key={m._id} className="w-6 h-6 rounded-full bg-brand-navy/20 flex items-center justify-center text-brand-navy text-xs font-bold"
                        title={m.name}>
                        {m.name?.charAt(0)}
                      </div>
                    ))}
                    {p.team.length > 4 && <span className="text-xs text-gray-400 ml-1">+{p.team.length - 4}</span>}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">No members</span>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    <Link
                      to={`/projects/${p._id}`}
                      className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                    >
                      <Eye size={12} /> View
                    </Link>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => { setEditProject(p); setModalOpen(true); }}
                        className="btn-secondary py-1 px-2 text-xs"
                      >
                        Edit
                      </button>
                    )}
                    {canToggleProject && (
                      <button
                        type="button"
                        onClick={() =>
                          statusToggleMutation.mutate({
                            id: p._id,
                            status: p.status === 'active' ? 'on_hold' : 'active',
                          })
                        }
                        disabled={statusToggleMutation.isPending}
                        className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                      >
                        {p.status === 'active' ? 'Inactive' : 'Active'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditProject(null); }}
        title={editProject ? `Edit — ${editProject.title}` : 'New Project'} size="lg">
        <ProjectForm onClose={() => { setModalOpen(false); setEditProject(null); }} existing={editProject} />
      </Modal>
    </div>
  );
}
