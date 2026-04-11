import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, IndianRupee, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi, clientsApi, projectsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Input, Select, Textarea, PageLoader, StatCard, EmptyState, ConfirmDialog } from '../../components/ui';
import { formatINR, formatDate, statusColors, slugToLabel } from '../../utils/helpers';

const STATUS_OPTS = [
  { value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }
];

function InvoiceForm({ onClose, existing }) {
  const qc = useQueryClient();
  const { data: cData } = useQuery({ queryKey: ['clients-all'], queryFn: () => clientsApi.list({ limit: 200 }).then(r => r.data) });
  const { data: pData } = useQuery({ queryKey: ['projects-all'], queryFn: () => projectsApi.list({ limit: 200 }).then(r => r.data) });
  const clients  = cData?.clients  || [];
  const projects = pData?.projects || [];

  const [form, setForm] = useState({
    clientId: existing?.clientId?._id || '', projectId: existing?.projectId?._id || '',
    status: existing?.status || 'draft', taxRate: existing?.taxRate ?? 18, discount: existing?.discount ?? 0,
    dueDate: existing?.dueDate ? existing.dueDate.slice(0, 10) : '',
    notes: existing?.notes || '',
    lineItems: existing?.lineItems?.length
      ? existing.lineItems
      : [{ description: '', service: 'SEO', quantity: 1, unitPrice: '', total: 0 }]
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const updateLine = (idx, k, v) => {
    const items = [...form.lineItems];
    items[idx] = { ...items[idx], [k]: v };
    if (k === 'unitPrice' || k === 'quantity') {
      items[idx].total = (parseFloat(items[idx].unitPrice) || 0) * (parseFloat(items[idx].quantity) || 0);
    }
    set('lineItems', items);
  };
  const addLine    = () => set('lineItems', [...form.lineItems, { description: '', service: 'SEO', quantity: 1, unitPrice: '', total: 0 }]);
  const removeLine = idx => set('lineItems', form.lineItems.filter((_, i) => i !== idx));

  const subtotal  = form.lineItems.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const taxAmount = (subtotal * (form.taxRate || 0)) / 100;
  const total     = subtotal + taxAmount - (parseFloat(form.discount) || 0);

  const SERVICES = ['SEO', 'Paid Ads', 'Social Media', 'Web Dev', 'Email Marketing', 'Content', 'Other'];

  const mutation = useMutation({
    mutationFn: data => existing ? financeApi.update(existing._id, data) : financeApi.create(data),
    onSuccess: () => { toast.success(existing ? 'Invoice updated' : 'Invoice created'); qc.invalidateQueries(['invoices']); onClose(); }
  });

  const save = () => mutation.mutate({
    ...form,
    lineItems: form.lineItems.map(i => ({ ...i, total: parseFloat(i.total) || 0 }))
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Client *" value={form.clientId} onChange={e => set('clientId', e.target.value)}
          options={[{ value: '', label: 'Select client...' }, ...clients.map(c => ({ value: c._id, label: c.company }))]} />
        <Select label="Project" value={form.projectId} onChange={e => set('projectId', e.target.value)}
          options={[{ value: '', label: 'No project' }, ...projects
            .filter(p => !form.clientId || p.clientId?._id === form.clientId)
            .map(p => ({ value: p._id, label: p.title }))]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}
          options={STATUS_OPTS.slice(1)} />
        <Input label="Due Date *" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label">Line Items</label>
          <button onClick={addLine} className="text-xs text-brand-navy hover:underline font-medium">+ Add Line</button>
        </div>
        <div className="space-y-2">
          {form.lineItems.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input placeholder="Description" value={item.description}
                onChange={e => updateLine(idx, 'description', e.target.value)}
                className="input col-span-4 text-xs" />
              <select value={item.service} onChange={e => updateLine(idx, 'service', e.target.value)}
                className="input col-span-2 text-xs">
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" placeholder="Qty" value={item.quantity}
                onChange={e => updateLine(idx, 'quantity', e.target.value)}
                className="input col-span-1 text-xs text-center" min="1" />
              <input type="number" placeholder="₹ Price" value={item.unitPrice}
                onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                className="input col-span-2 text-xs" min="0" />
              <span className="col-span-2 text-sm font-semibold text-gray-800 px-1">{formatINR(item.total)}</span>
              <button onClick={() => removeLine(idx)} className="col-span-1 text-gray-400 hover:text-red-500 text-lg text-center leading-none">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-surface-secondary rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium">{formatINR(subtotal)}</span></div>
        <div className="flex justify-between items-center text-gray-600">
          <div className="flex items-center gap-2">
            <span>GST</span>
            <input type="number" value={form.taxRate} onChange={e => set('taxRate', e.target.value)}
              className="input w-14 text-xs text-center py-0.5" min="0" max="100" />
            <span>%</span>
          </div>
          <span className="font-medium">{formatINR(taxAmount)}</span>
        </div>
        <div className="flex justify-between items-center text-gray-600">
          <span>Discount (₹)</span>
          <input type="number" value={form.discount} onChange={e => set('discount', e.target.value)}
            className="input w-28 text-xs text-right py-0.5" min="0" />
        </div>
        <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
          <span>Total</span>
          <span className="text-brand-navy">{formatINR(total)}</span>
        </div>
      </div>

      <div>
        <label className="label">Notes / Payment Terms</label>
        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Bank details, payment terms, etc." className="input resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save}
          disabled={mutation.isPending || !form.clientId || !form.dueDate}>
          {mutation.isPending ? 'Saving...' : existing ? 'Update Invoice' : 'Create Invoice'}
        </button>
      </div>
    </div>
  );
}

function MarkPaidModal({ invoice, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    paidAmount: invoice?.total || '',
    paymentMethod: 'Bank Transfer',
    paymentReference: ''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const mutation = useMutation({
    mutationFn: () => financeApi.markPaid(invoice._id, form),
    onSuccess: () => { toast.success('Payment recorded ✓'); qc.invalidateQueries(['invoices', 'finance-summary']); onClose(); }
  });
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500 mb-1">Invoice total</p>
        <p className="text-3xl font-bold text-green-600">{formatINR(invoice?.total)}</p>
        <p className="text-xs text-gray-400 mt-1">{invoice?.invoiceNumber} · {invoice?.clientId?.company}</p>
      </div>
      <Input label="Amount Received (₹)" type="number" value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} />
      <Select label="Payment Method" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}
        options={['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Online', 'NEFT', 'RTGS'].map(v => ({ value: v, label: v }))} />
      <Input label="Reference / UTR Number" value={form.paymentReference} onChange={e => set('paymentReference', e.target.value)} placeholder="UTR / Ref#12345" />
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.paidAmount}>
          {mutation.isPending ? 'Recording...' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
}

export default function FinancePage() {
  // No role check — backend controls access. Super admin always sees everything.
  const { canManage } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus]           = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [payModal, setPayModal]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Summary — always fetch, backend enforces access
  const { data: summaryData } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.summary().then(r => r.data.summary),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { status }],
    queryFn: () => financeApi.list({ status, limit: 50 }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => financeApi.delete(deleteTarget._id),
    onSuccess: () => { toast.success('Invoice deleted'); qc.invalidateQueries(['invoices']); setDeleteTarget(null); }
  });

  const invoices = data?.invoices || [];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Finance</h2>
          <p className="text-sm text-gray-500">{invoices.length} invoices</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditInvoice(null); setModalOpen(true); }}>
            <Plus size={16} /> New Invoice
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Monthly Revenue" value={formatINR(summaryData.mrr)} color="text-green-600"
            icon={TrendingUp} trend={summaryData.mrrGrowth} />
          <StatCard label="Outstanding" value={formatINR(summaryData.outstanding)} color="text-amber-600"
            icon={AlertCircle} sub={`${summaryData.outstandingCount} invoices pending`} />
          <StatCard label="Active Clients" value={summaryData.activeClients} icon={IndianRupee}
            sub={`${formatINR(summaryData.revenuePerClient)}/client avg`} />
          <StatCard label="Yearly Revenue" value={formatINR(summaryData.yearlyRevenue)} />
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-surface-secondary p-1 rounded-xl w-fit">
        {STATUS_OPTS.map(o => (
          <button key={o.value} onClick={() => setStatus(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              status === o.value ? 'bg-white text-brand-navy shadow-card' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {o.label || 'All'}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState icon={IndianRupee} title="No invoices" description="Create your first invoice to get started" />
              </td></tr>
            ) : invoices.map(inv => (
              <tr key={inv._id}>
                <td>
                  <p className="text-sm font-bold text-brand-navy">{inv.invoiceNumber}</p>
                </td>
                <td>
                  <p className="text-sm font-medium text-gray-900">{inv.clientId?.company || '—'}</p>
                  <p className="text-xs text-gray-400">{inv.clientId?.email}</p>
                </td>
                <td>
                  <p className="text-xs text-gray-600">{inv.projectId?.title || '—'}</p>
                </td>
                <td>
                  <p className="text-sm font-bold text-gray-900">{formatINR(inv.total)}</p>
                  {inv.paidAmount > 0 && inv.paidAmount < inv.total && (
                    <p className="text-xs text-amber-600">Paid: {formatINR(inv.paidAmount)}</p>
                  )}
                </td>
                <td><p className="text-xs text-gray-500">{formatDate(inv.issueDate)}</p></td>
                <td>
                  <p className={`text-xs font-medium ${inv.status === 'overdue' ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatDate(inv.dueDate)}
                  </p>
                </td>
                <td>
                  <span className={`text-xs ${statusColors[inv.status] || 'badge-gray'}`}>
                    {slugToLabel(inv.status)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1 flex-wrap">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => setPayModal(inv)}
                        className="btn-primary py-1 px-2 text-xs whitespace-nowrap">
                        <CheckCircle size={11} /> Paid
                      </button>
                    )}
                    <button onClick={() => { setEditInvoice(inv); setModalOpen(true); }}
                      className="btn-secondary py-1 px-2 text-xs">Edit</button>
                    {inv.status === 'draft' && (
                      <button onClick={() => setDeleteTarget(inv)} className="btn-danger py-1 px-2 text-xs">Del</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditInvoice(null); }}
        title={editInvoice ? `Edit ${editInvoice.invoiceNumber}` : 'New Invoice'} size="lg">
        <InvoiceForm onClose={() => { setModalOpen(false); setEditInvoice(null); }} existing={editInvoice} />
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record Payment — ${payModal?.invoiceNumber}`}>
        {payModal && <MarkPaidModal invoice={payModal} onClose={() => setPayModal(null)} />}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()} loading={deleteMutation.isPending}
        title="Delete Invoice" confirmLabel="Delete" danger
        message={`Delete invoice "${deleteTarget?.invoiceNumber}"? This cannot be undone.`} />
    </div>
  );
}
