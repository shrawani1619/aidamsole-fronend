import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, FolderKanban, CheckSquare, DollarSign, TrendingUp, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { dashboardApi, reportsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatCard, PageLoader, Avatar, ProgressBar } from '../../components/ui';
import { formatINR, formatDate, healthBg, statusColors, slugToLabel, isOverdue } from '../../utils/helpers';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => dashboardApi.get().then(r => r.data.data),
    refetchInterval: 60000,
  });

  // Always fetch insights — backend returns empty/scoped data for non-admins gracefully
  const { data: insights } = useQuery({
    queryKey: ['super-admin-insights'],
    queryFn:  () => reportsApi.superAdminInsights().then(r => r.data.data),
    refetchInterval: 120000,
    retry: false, // Don't retry if non-admin gets an error
  });

  if (isLoading) return <PageLoader />;

  const d = dash || {};
  const i = insights;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.departmentId?.name ? `${user.departmentId.name} Department` : 'Agency Overview'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link to="/reports" className="btn-secondary text-xs hidden sm:flex">
          Reports <ArrowRight size={13} />
        </Link>
      </div>

      {/* Admin KPIs (only shown when insights API returns data) */}
      {i && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="MRR" value={formatINR(i.kpis.mrr)} icon={DollarSign} color="text-green-600"
            sub={`${i.kpis.revenueGrowth >= 0 ? '+' : ''}${i.kpis.revenueGrowth}% vs last month`}
            trend={i.kpis.revenueGrowth} />
          <StatCard label="Active Clients" value={i.kpis.activeClients} icon={Users}
            sub={`${i.kpis.churnRate}% churn rate`} />
          <StatCard label="This Month" value={formatINR(i.kpis.thisMonthRevenue)} icon={TrendingUp}
            sub="Revenue collected" color="text-brand-navy" />
          <StatCard label="Delayed Tasks" value={i.kpis.delayedTasks} icon={AlertTriangle}
            sub={`${i.kpis.taskDelayRate}% delay rate`}
            color={i.kpis.delayedTasks > 5 ? 'text-red-600' : 'text-amber-600'} />
        </div>
      )}

      {/* General stats (always shown) */}
      {!i && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Clients"  value={d.clients?.active || 0}            icon={Users} />
          <StatCard label="Active Projects" value={d.projects?.active || 0}           icon={FolderKanban} />
          <StatCard label="My Open Tasks"   value={d.myTasks?.length || 0}            icon={CheckSquare} />
          <StatCard label="At-Risk Clients" value={d.clients?.at_risk || 0}           icon={AlertTriangle}
            color={(d.clients?.at_risk || 0) > 0 ? 'text-red-600' : 'text-gray-900'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">My Open Tasks</h3>
            <Link to="/tasks" className="text-xs text-brand-navy hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {!d.myTasks?.length ? (
            <div className="py-10 text-center">
              <CheckSquare size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">All caught up! No open tasks.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {d.myTasks.slice(0, 7).map(task => (
                <Link key={task._id} to={`/tasks/${task._id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-secondary transition-colors group">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'critical' ? 'bg-red-500' :
                    task.priority === 'high'     ? 'bg-orange-500' :
                    task.priority === 'medium'   ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-brand-navy">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{task.clientId?.company} · {task.projectId?.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOverdue(task.dueDate) && <span className="badge-red text-xs">Overdue</span>}
                    {task.dueDate && !isOverdue(task.dueDate) && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {formatDate(task.dueDate, 'dd MMM')}
                      </span>
                    )}
                    <span className={`text-xs ${statusColors[task.status] || 'badge-gray'}`}>
                      {slugToLabel(task.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Client Health / At-Risk */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Client Health</h3>
            <Link to="/clients" className="text-xs text-brand-navy hover:underline flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          </div>

          {i && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Green', count: i.topClients?.length || 0,   color: 'bg-green-500' },
                { label: 'Amber', count: Math.max(0, (i.kpis.activeClients || 0) - (i.topClients?.length || 0) - (i.riskClients?.length || 0)), color: 'bg-amber-500' },
                { label: 'Red',   count: i.riskClients?.length || 0,  color: 'bg-red-500'   },
              ].map(({ label, count, color }) => (
                <div key={label} className="bg-surface-secondary rounded-xl p-2 text-center">
                  <div className={`w-2 h-2 ${color} rounded-full mx-auto mb-1`} />
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          )}

          {i?.riskClients?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                <AlertTriangle size={11} /> At-Risk — Call Today
              </p>
              <div className="space-y-2">
                {i.riskClients.slice(0, 4).map(client => (
                  <Link key={client._id} to={`/clients/${client._id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-secondary transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{client.company}</p>
                      <p className="text-xs text-gray-400">{client.assignedAM?.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${healthBg(client.healthScore?.overall || 0)}`}>
                      {client.healthScore?.overall || 0}/10
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(!i?.riskClients?.length) && (
            <div className="py-6 text-center">
              <p className="text-3xl mb-1">🎉</p>
              <p className="text-xs text-gray-400">No at-risk clients!</p>
            </div>
          )}
        </div>
      </div>

      {/* Dept performance (only if insights returned) */}
      {i?.departments?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Department Performance</h3>
            <Link to="/departments" className="text-xs text-brand-navy hover:underline flex items-center gap-1">
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {i.departments.map(dept => (
              <div key={dept._id} className="text-center">
                <div className="w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: dept.color }}>
                  {dept.name?.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-xs font-medium text-gray-700 truncate">{dept.name}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{dept.efficiency}%</p>
                <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
                  <div className="h-1 rounded-full transition-all" style={{ width: `${dept.efficiency}%`, backgroundColor: dept.color }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{dept.members} members</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      {d.upcomingDeadlines?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock size={15} className="text-brand-navy" /> Upcoming Deadlines (7 days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {d.upcomingDeadlines.map(task => (
              <Link key={task._id} to={`/tasks/${task._id}`}
                className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-brand-navy/20 hover:bg-surface-secondary transition-all">
                <div className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-center flex-shrink-0 leading-tight ${
                  isOverdue(task.dueDate) ? 'bg-red-100 text-red-700' : 'bg-brand-navy/8 text-brand-navy'
                }`}>
                  <div>{formatDate(task.dueDate, 'dd')}</div>
                  <div>{formatDate(task.dueDate, 'MMM')}</div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400">{task.clientId?.company}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
