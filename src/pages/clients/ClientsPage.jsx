import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Filter, Search, Users, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi, departmentsApi, usersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Modal, Input, Select, Textarea, SearchInput, StatCard, PageLoader, Avatar, EmptyState, ConfirmDialog
} from '../../components/ui';
import { formatINR, formatDate, healthBg, statusColors, slugToLabel, daysUntil } from '../../utils/helpers';
import { digitsOnlyMax10, phoneToApi, phoneFieldValue } from '../../utils/phone';

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'At Risk' }, { value: 'onboarding', label: 'Onboarding' },
  { value: 'lead', label: 'Lead' }, { value: 'paused', label: 'Paused' }, { value: 'churned', label: 'Churned' }
];

const SERVICES_OPTS = ['SEO', 'Paid Ads', 'Social Media', 'Web Dev', 'Email Marketing', 'Content', 'Other'];

function ClientForm({ onClose, existing }) {
  const qc = useQueryClient();
  const { data: deptsData } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list().then(r => r.data) });
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list().then(r => r.data) });
  const departments = deptsData?.departments || [];
  const users = usersData?.users || [];

  const [form, setForm] = useState({
    name: existing?.name || '', company: existing?.company || '', email: existing?.email || '',
    phone: phoneFieldValue(existing?.phone), website: existing?.website || '', industry: existing?.industry || '',
    status: existing?.status || 'lead', contractValue: existing?.contractValue || '',
    assignedAM: existing?.assignedAM?._id || '', notes: existing?.notes || '',
    services: existing?.services || [], assignedDepartments: existing?.assignedDepartments?.map(d => d._id) || [],
    renewalDate: existing?.renewalDate ? existing.renewalDate.slice(0, 10) : '',
    contractStart: existing?.contractStart ? existing.contractStart.slice(0, 10) : '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleService = (svc) => set('services', form.services.includes(svc) ? form.services.filter(s => s !== svc) : [...form.services, svc]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, phone: phoneToApi(data.phone) };
      return existing ? clientsApi.update(existing._id, payload) : clientsApi.create(payload);
    },
    onSuccess: () => { toast.success(existing ? 'Client updated' : 'Client created'); qc.invalidateQueries(['clients']); onClose(); }
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Contact Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Rajesh Khurana" required />
        <Input label="Company *" value={form.company} onChange={e => set('company', e.target.value)} placeholder="TechVista India" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@company.com" />
        <Input label="Phone" type="tel" inputMode="numeric" maxLength={10}
          value={form.phone} onChange={e => set('phone', digitsOnlyMax10(e.target.value))} placeholder="9876543210" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
        <Input label="Industry" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Technology" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={STATUS_OPTS.slice(1)} />
        <Input label="Monthly Contract Value (₹)" type="number" value={form.contractValue}
          onChange={e => set('contractValue', e.target.value)} placeholder="45000" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Contract Start" type="date" value={form.contractStart} onChange={e => set('contractStart', e.target.value)} />
        <Input label="Renewal Date" type="date" value={form.renewalDate} onChange={e => set('renewalDate', e.target.value)} />
      </div>
      <Select label="Assigned Account Manager" value={form.assignedAM} onChange={e => set('assignedAM', e.target.value)}
        options={[{ value: '', label: 'Select AM...' }, ...users.map(u => ({ value: u._id, label: u.name }))]} />
      <div>
        <label className="label">Services</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {SERVICES_OPTS.map(s => (
            <button key={s} type="button" onClick={() => toggleService(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.services.includes(s) ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-200 text-gray-600 hover:border-brand-navy'
              }`}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Departments</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {departments.map(d => (
            <button key={d._id} type="button"
              onClick={() => set('assignedDepartments', form.assignedDepartments.includes(d._id)
                ? form.assignedDepartments.filter(id => id !== d._id)
                : [...form.assignedDepartments, d._id])}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.assignedDepartments.includes(d._id) ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'
              }`} style={form.assignedDepartments.includes(d._id) ? { backgroundColor: d.color, borderColor: d.color } : {}}>
              {d.name}
            </button>
          ))}
        </div>
      </div>
      <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any important notes..." />
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : existing ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const { canManage } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, status, page }],
    queryFn: () => clientsApi.list({ search, status, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: () => clientsApi.delete(deleteTarget._id),
    onSuccess: () => { toast.success('Client churned'); qc.invalidateQueries(['clients']); setDeleteTarget(null); }
  });

  const clients = data?.clients || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const statusCount = (s) => clients.filter(c => c.status === s).length;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Clients</h2>
          <p className="text-sm text-gray-500">{total} total clients</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditClient(null); setModalOpen(true); }}>
            <Plus size={16} /> Add Client
          </button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active" value={clients.filter(c => c.status === 'active').length} color="text-green-600" />
        <StatCard label="At Risk" value={clients.filter(c => c.status === 'at_risk').length} color="text-red-600" />
        <StatCard label="Onboarding" value={clients.filter(c => c.status === 'onboarding').length} color="text-blue-600" />
        <StatCard label="Churned" value={clients.filter(c => c.status === 'churned').length} color="text-gray-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search clients..." className="flex-1" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-full sm:w-40">
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Services</th>
              <th>AM</th>
              <th>Health</th>
              <th>Value</th>
              <th>Renewal</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr><td colSpan={8}><EmptyState icon={Users} title="No clients found" description="Adjust filters or add your first client" /></td></tr>
            ) : clients.map(client => {
              const days = daysUntil(client.renewalDate);
              return (
                <tr key={client._id}>
                  <td>
                    <Link to={`/clients/${client._id}`} className="flex items-center gap-2.5 group">
                      <div className="w-8 h-8 rounded-lg bg-brand-navy/10 flex items-center justify-center text-brand-navy text-xs font-bold flex-shrink-0">
                        {client.company?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-navy">{client.company}</p>
                        <p className="text-xs text-gray-400">{client.name}</p>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {client.services?.slice(0, 2).map(s => (
                        <span key={s} className="badge-blue text-xs">{s}</span>
                      ))}
                      {client.services?.length > 2 && <span className="badge-gray text-xs">+{client.services.length - 2}</span>}
                    </div>
                  </td>
                  <td>
                    {client.assignedAM ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar user={client.assignedAM} size="xs" />
                        <span className="text-xs text-gray-600">{client.assignedAM.name?.split(' ')[0]}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${healthBg(client.healthScore?.overall || 0)}`}>
                      {client.healthScore?.overall || 0}/10
                    </span>
                  </td>
                  <td className="text-sm font-medium text-gray-900">{formatINR(client.contractValue)}</td>
                  <td>
                    {client.renewalDate ? (
                      <span className={`text-xs ${days !== null && days <= 14 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {days !== null && days <= 0 ? 'Overdue' : days !== null && days <= 30 ? `${days}d` : formatDate(client.renewalDate, 'MMM yy')}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td>
                    <span className={`text-xs ${statusColors[client.status] || 'badge-gray'}`}>
                      {slugToLabel(client.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link to={`/clients/${client._id}`} className="btn-secondary py-1 px-2 text-xs">View</Link>
                      {canManage && (
                        <button onClick={() => { setEditClient(client); setModalOpen(true); }}
                          className="btn-secondary py-1 px-2 text-xs">Edit</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-secondary py-1 px-3 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <button className="btn-secondary py-1 px-3 text-xs" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>Next</button>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditClient(null); }}
        title={editClient ? `Edit — ${editClient.company}` : 'Add New Client'} size="lg">
        <ClientForm key={editClient?._id || 'new'} onClose={() => { setModalOpen(false); setEditClient(null); }} existing={editClient} />
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()} loading={deleteMutation.isPending}
        title="Churn Client" confirmLabel="Mark Churned" danger
        message={`Mark "${deleteTarget?.company}" as churned? This cannot be undone easily.`} />
    </div>
  );
}
