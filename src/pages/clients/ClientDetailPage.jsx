import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  User,
  UserCog,
  Briefcase,
  Wallet,
  Layers,
  FileText,
} from 'lucide-react';
import { clientsApi, projectsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState, Avatar, StatCard } from '../../components/ui';
import {
  formatINR,
  formatDate,
  healthBg,
  statusColors,
  slugToLabel,
  daysUntil,
} from '../../utils/helpers';
import { phoneFieldValue } from '../../utils/phone';

function Field({ label, children, icon: Icon }) {
  return (
    <div className="flex gap-3">
      {Icon && <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="text-sm text-gray-900 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const { isAdmin } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.get(clientId).then((r) => r.data),
    enabled: !!clientId,
  });

  const { data: timelineData } = useQuery({
    queryKey: ['client-timeline', clientId],
    queryFn: () => clientsApi.timeline(clientId).then((r) => r.data),
    enabled: !!clientId && !!data?.client,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'by-client', clientId],
    queryFn: () => projectsApi.list({ client: clientId, limit: 8 }).then((r) => r.data),
    enabled: !!clientId && !!data?.client,
  });

  if (isLoading) return <PageLoader />;

  if (isError || !data?.client) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-brand-navy hover:underline">
          <ArrowLeft size={16} /> Back to clients
        </Link>
        <EmptyState
          title="Client not found"
          description={error?.response?.data?.message || 'This client may have been removed or you may not have access.'}
        />
      </div>
    );
  }

  const client = data.client;
  const stats = data.stats || { projects: 0, totalBilled: 0, totalPaid: 0 };
  const renewalDays = daysUntil(client.renewalDate);
  const phoneDisplay = phoneFieldValue(client.phone);
  const timeline = timelineData?.timeline || [];
  const recentProjects = projectsData?.projects || [];

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm text-brand-navy hover:underline">
        <ArrowLeft size={16} /> Back to clients
      </Link>

      <div className="card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-brand-navy/10 flex items-center justify-center text-brand-navy text-sm font-bold flex-shrink-0">
              {client.company?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{client.company}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs ${statusColors[client.status] || 'badge-gray'}`}>
              {slugToLabel(client.status)}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${healthBg(client.healthScore?.overall ?? 0)}`}
            >
              Health {client.healthScore?.overall ?? 0}/10
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Projects" value={stats.projects} color="text-brand-navy" />
          <StatCard label="Total billed" value={formatINR(stats.totalBilled)} color="text-gray-900" />
          <StatCard label="Total paid" value={formatINR(stats.totalPaid)} color="text-green-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
          <div className="space-y-4">
            <Field label="Email" icon={Mail}>
              {client.email ? (
                <a href={`mailto:${client.email}`} className="text-brand-navy hover:underline break-all">
                  {client.email}
                </a>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Phone" icon={Phone}>
              {phoneDisplay ? <span>{phoneDisplay}</span> : '—'}
            </Field>
            <Field label="Website" icon={Globe}>
              {client.website ? (
                <a
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-navy hover:underline break-all"
                >
                  {client.website}
                </a>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Industry" icon={Building2}>
              {client.industry || '—'}
            </Field>
          </div>
          <div className="space-y-4">
            <Field label="Account manager" icon={User}>
              {client.assignedAM ? (
                <div className="flex items-center gap-2">
                  <Avatar user={client.assignedAM} size="xs" />
                  <span>{client.assignedAM.name}</span>
                </div>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Project manager" icon={UserCog}>
              {client.projectManager ? (
                <div className="flex items-center gap-2">
                  <Avatar user={client.projectManager} size="xs" />
                  <span>{client.projectManager.name}</span>
                </div>
              ) : (
                '—'
              )}
            </Field>
            {isAdmin && (
              <Field label="Monthly contract (₹)" icon={Wallet}>
                {formatINR(client.contractValue)}
              </Field>
            )}
            <Field label="Contract start" icon={Calendar}>
              {client.contractStart ? formatDate(client.contractStart, 'dd MMM yyyy') : '—'}
            </Field>
            <Field label="Renewal" icon={Calendar}>
              {client.renewalDate ? (
                <span>
                  {formatDate(client.renewalDate, 'dd MMM yyyy')}
                  {renewalDays !== null && (
                    <span
                      className={`ml-2 text-xs ${renewalDays <= 14 ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                    >
                      (
                      {renewalDays <= 0 ? 'Overdue' : `${renewalDays}d`}
                      )
                    </span>
                  )}
                </span>
              ) : (
                '—'
              )}
            </Field>
          </div>
        </div>

        {client.assignedDepartments?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Layers size={12} /> Departments
            </p>
            <div className="flex flex-wrap gap-2">
              {client.assignedDepartments.map((d) => (
                <span
                  key={d._id}
                  className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                  style={{ backgroundColor: d.color || '#0D1B8E' }}
                >
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {client.services?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Briefcase size={12} /> Services
            </p>
            <div className="flex flex-wrap gap-2">
              {client.services.map((s) => (
                <span key={s} className="badge-blue text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {client.notes && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg bg-surface-secondary p-3 border border-gray-100">
              {client.notes}
            </p>
          </div>
        )}
      </div>

      {recentProjects.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent projects</h2>
          <ul className="divide-y divide-gray-100">
            {recentProjects.map((p) => (
              <li key={p._id} className="py-2.5 first:pt-0 last:pb-0">
                <Link
                  to={`/projects/${p._id}`}
                  className="flex items-center justify-between gap-3 text-sm hover:text-brand-navy"
                >
                  <span className="font-medium text-gray-900 truncate">{p.title}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{slugToLabel(p.status)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {timeline.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" /> Activity
          </h2>
          <ul className="space-y-3">
            {timeline.slice(0, 12).map((item, i) => (
              <li key={`${item.type}-${i}-${item.date}`} className="flex gap-3 text-sm">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">
                  {formatDate(item.date, 'dd MMM yyyy')}
                </span>
                <span className="text-gray-600">
                  <span className="font-medium text-gray-800">{item.title}</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span className="text-xs uppercase">{item.type}</span>
                  {item.status && (
                    <span className="text-xs text-gray-500 ml-1">({slugToLabel(item.status)})</span>
                  )}
                  {item.amount != null && (
                    <span className="text-xs text-gray-600 ml-1">{formatINR(item.amount)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
