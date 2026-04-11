import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '—';
  try { return format(typeof date === 'string' ? parseISO(date) : date, fmt); }
  catch { return '—'; }
};

export const formatDateTime = (date) => formatDate(date, 'dd MMM yyyy, hh:mm a');
export const timeAgo = (date) => { try { return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true }); } catch { return '—'; } };
export const isOverdue = (date) => date && isAfter(new Date(), typeof date === 'string' ? parseISO(date) : date);

export const formatINR = (amount) => {
  if (amount == null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
};

export const formatNumber = (n) => Number(n).toLocaleString('en-IN');

export const getInitials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export const healthColor = (score) => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-amber-600';
  return 'text-red-600';
};

export const healthBg = (score) => {
  if (score >= 8) return 'bg-green-100 text-green-700';
  if (score >= 5) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

export const healthLabel = (score) => {
  if (score >= 8) return 'Green';
  if (score >= 5) return 'Amber';
  return 'Red';
};

export const statusColors = {
  active: 'badge-green', at_risk: 'badge-red', onboarding: 'badge-blue',
  paused: 'badge-gray', churned: 'badge-red', lead: 'badge-purple',
  planning: 'badge-purple', on_hold: 'badge-amber', completed: 'badge-green', cancelled: 'badge-gray',
  todo: 'badge-gray', in_progress: 'badge-blue', review: 'badge-amber', approved: 'badge-green',
  done: 'badge-green', blocked: 'badge-red',
  draft: 'badge-gray', sent: 'badge-blue', viewed: 'badge-purple', paid: 'badge-green', overdue: 'badge-red',
};

export const priorityColors = {
  critical: 'badge-red', high: 'badge-amber', medium: 'badge-blue', low: 'badge-gray'
};

export const DEPT_COLORS = {
  'SEO': '#10B981', 'Paid Ads': '#3B82F6', 'Social Media': '#8B5CF6',
  'Web Dev': '#F59E0B', 'Sales': '#EF4444', 'Accounts': '#6B7280'
};

export const truncate = (str, n = 40) => str?.length > n ? str.slice(0, n) + '...' : str;
export const capitalize = (s) => s?.charAt(0).toUpperCase() + s?.slice(1);
export const slugToLabel = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export const daysUntil = (date) => {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
};

export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
