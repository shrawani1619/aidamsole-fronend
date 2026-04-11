import React from 'react';
import { Loader2, X, ChevronDown, Search, AlertCircle } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return <Loader2 className={`animate-spin text-brand-navy ${sizes[size]} ${className}`} />;
};

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Spinner size="lg" />
      <span className="text-sm text-gray-500">Loading...</span>
    </div>
  </div>
);

// ── Avatar ────────────────────────────────────────────────────────────────────
export const Avatar = ({ user, size = 'md', className = '' }) => {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-14 h-14 text-lg' };
  if (user?.avatar) return <img src={user.avatar} alt={user.name} className={`${sizes[size]} rounded-full object-cover ${className}`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-brand-navy text-white font-semibold flex items-center justify-center flex-shrink-0 ${className}`}>
      {getInitials(user?.name || '?')}
    </div>
  );
};

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    green: 'badge-green', amber: 'badge-amber', red: 'badge-red',
    blue: 'badge-blue', purple: 'badge-purple', gray: 'badge-gray',
  };
  return <span className={`${variants[variant] || variant} ${className}`}>{children}</span>;
};

// ── Modal ─────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, size = 'md', footer }) => {
  if (!open) return null;
  const sizeClass = size === 'xl' ? 'modal-xl' : size === 'lg' ? 'modal-lg' : 'modal';
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={sizeClass}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 bg-surface-secondary rounded-b-2xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    <input className={`input ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`} {...props} />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ── Select ────────────────────────────────────────────────────────────────────
export const Select = ({ label, error, options = [], className = '', ...props }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    <div className="relative">
      <select className={`input appearance-none pr-8 ${error ? 'border-red-300' : ''}`} {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ── Textarea ──────────────────────────────────────────────────────────────────
export const Textarea = ({ label, error, rows = 3, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    <textarea rows={rows} className={`input resize-none ${error ? 'border-red-300' : ''}`} {...props} />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ── Search Input ──────────────────────────────────────────────────────────────
export const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input value={value} onChange={onChange} placeholder={placeholder}
      className="input pl-9 w-full" />
  </div>
);

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && <div className="w-14 h-14 bg-surface-tertiary rounded-2xl flex items-center justify-center mb-4"><Icon size={24} className="text-gray-400" /></div>}
    <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
    {description && <p className="text-xs text-gray-400 mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon: Icon, color = 'text-brand-navy', trend, className = '' }) => (
  <div className={`stat-card ${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {Icon && <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center flex-shrink-0"><Icon size={18} className="text-brand-navy" /></div>}
    </div>
    {trend != null && (
      <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
        <span className="text-gray-400 font-normal">vs last month</span>
      </div>
    )}
  </div>
);

// ── Progress Bar ──────────────────────────────────────────────────────────────
export const ProgressBar = ({ value = 0, color = 'bg-brand-navy', className = '', showLabel = true }) => (
  <div className={className}>
    {showLabel && <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{value}%</span></div>}
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  </div>
);

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true, loading }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm"
    footer={<>
      <button className="btn-secondary" onClick={onClose}>Cancel</button>
      <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
        {loading ? <Spinner size="sm" /> : confirmLabel}
      </button>
    </>}>
    <p className="text-sm text-gray-600">{message}</p>
  </Modal>
);

// ── Alert ─────────────────────────────────────────────────────────────────────
export const Alert = ({ type = 'info', message }) => {
  const styles = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${styles[type]}`}>
      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

// ── Tab Group ─────────────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 bg-surface-secondary p-1 rounded-lg">
    {tabs.map(t => (
      <button key={t.value} onClick={() => onChange(t.value)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 
          ${active === t.value ? 'bg-white text-brand-navy shadow-card' : 'text-gray-500 hover:text-gray-700'}`}>
        {t.icon && React.createElement(t.icon, { size: 14 })}
        {t.label}
      </button>
    ))}
  </div>
);

// ── Health Score Widget ───────────────────────────────────────────────────────
export const HealthScoreBadge = ({ score }) => {
  const { healthBg, healthLabel } = require('../../utils/helpers');
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${healthBg(score)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}/10 · {healthLabel(score)}
    </span>
  );
};
