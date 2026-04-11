import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, TrendingUp, Users, Activity, RefreshCw } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { reportsApi } from '../../services/api';
import { PageLoader, StatCard, Tabs, Avatar } from '../../components/ui';
import { formatINR, formatDate, healthBg, slugToLabel } from '../../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: '#f1f3f9' } }
  }
};
const COLORS = {
  navy: '#0D1B8E', red: '#D32F2F', green: '#10B981',
  amber: '#F59E0B', blue: '#3B82F6', purple: '#8B5CF6'
};

const RANGES = [
  { value: 'daily',   label: 'Today'      },
  { value: 'weekly',  label: 'This Week'  },
  { value: 'monthly', label: 'This Month' },
  { value: 'yearly',  label: 'This Year'  },
];

// All report tabs visible to all authenticated users
// Backend's departmentScope ensures employees only see their own dept data
const REPORT_TABS = [
  { value: 'financial',    label: 'Financial',    icon: TrendingUp },
  { value: 'client',       label: 'Client',       icon: Users      },
  { value: 'team',         label: 'Team',         icon: Activity   },
  { value: 'operational',  label: 'Operational',  icon: BarChart2  },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('financial');
  const [range, setRange]               = useState('monthly');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');

  const params = { range, ...(startDate && { startDate }), ...(endDate && { endDate }) };

  // All queries always enabled — backend returns scoped data per role
  const { data: finData,    isLoading: finLoading,    refetch: refetchFin    } = useQuery({
    queryKey: ['report-financial',   params],
    queryFn:  () => reportsApi.financial(params).then(r => r.data.data),
    enabled:  activeReport === 'financial',
  });

  const { data: clientData, isLoading: clientLoading, refetch: refetchClient } = useQuery({
    queryKey: ['report-client',      params],
    queryFn:  () => reportsApi.clientPerformance(params).then(r => r.data.data),
    enabled:  activeReport === 'client',
  });

  const { data: teamData,   isLoading: teamLoading,   refetch: refetchTeam   } = useQuery({
    queryKey: ['report-team',        params],
    queryFn:  () => reportsApi.teamPerformance(params).then(r => r.data.data),
    enabled:  activeReport === 'team',
  });

  const { data: opsData,    isLoading: opsLoading,    refetch: refetchOps    } = useQuery({
    queryKey: ['report-ops',         params],
    queryFn:  () => reportsApi.operational(params).then(r => r.data.data),
    enabled:  activeReport === 'operational',
  });

  const isLoading =
    (activeReport === 'financial'   && finLoading)    ||
    (activeReport === 'client'      && clientLoading) ||
    (activeReport === 'team'        && teamLoading)   ||
    (activeReport === 'operational' && opsLoading);

  const refetch = () => {
    if      (activeReport === 'financial')   refetchFin();
    else if (activeReport === 'client')      refetchClient();
    else if (activeReport === 'team')        refetchTeam();
    else                                     refetchOps();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="text-sm text-gray-500">Analytics &amp; insights</p>
        </div>
        <button onClick={refetch} className="btn-secondary text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Tabs active={activeReport} onChange={setActiveReport} tabs={REPORT_TABS} />
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r.value
                  ? 'bg-brand-navy text-white'
                  : 'bg-surface-secondary text-gray-600 hover:bg-gray-200'
              }`}>
              {r.label}
            </button>
          ))}
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="input text-xs w-36" placeholder="Start" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="input text-xs w-36" placeholder="End" />
        </div>
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* ── FINANCIAL ──────────────────────────────────────────────────── */}
          {activeReport === 'financial' && finData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Revenue Collected" value={formatINR(finData.summary.totalRevenue)} color="text-green-600" icon={TrendingUp} />
                <StatCard label="MRR"               value={formatINR(finData.summary.mrr)} icon={BarChart2} />
                <StatCard label="Outstanding"       value={formatINR(finData.summary.outstanding)} color="text-amber-600" />
                <StatCard label="Overdue"            value={formatINR(finData.summary.overdueAmount)} color="text-red-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card">
                  <h3 className="text-sm font-semibold mb-4">Monthly Revenue Trend</h3>
                  <div className="h-52">
                    <Bar
                      data={{
                        labels: finData.monthly.map(m => m.month),
                        datasets: [
                          { label: 'Collected', data: finData.monthly.map(m => m.revenue), backgroundColor: COLORS.navy + 'cc', borderRadius: 6 },
                          { label: 'Billed',    data: finData.monthly.map(m => m.billed),  backgroundColor: COLORS.amber + '66', borderRadius: 6 }
                        ]
                      }}
                      options={{ ...CHART_OPTS, plugins: { legend: { display: true, position: 'top' } } }}
                    />
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold mb-4">Revenue by Service</h3>
                  <div className="h-52 flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: finData.byService.map(s => s.service),
                        datasets: [{
                          data: finData.byService.map(s => s.amount),
                          backgroundColor: Object.values(COLORS),
                          borderWidth: 0
                        }]
                      }}
                      options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold mb-4">Top Clients by Revenue</h3>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>#</th><th>Company</th><th>Revenue</th><th>Invoices</th></tr></thead>
                    <tbody>
                      {finData.topClients.slice(0, 10).map((c, i) => (
                        <tr key={i}>
                          <td className="text-gray-400 text-xs w-8">{i + 1}</td>
                          <td className="font-medium">{c.client?.company || '—'}</td>
                          <td className="text-green-600 font-semibold">{formatINR(c.revenue)}</td>
                          <td className="text-gray-500">{c.invoiceCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CLIENT PERFORMANCE ─────────────────────────────────────────── */}
          {activeReport === 'client' && clientData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Clients"    value={clientData.summary.totalClients} icon={Users} />
                <StatCard label="Avg Health Score" value={`${clientData.summary.avgHealthScore}/10`} />
                <StatCard label="At Risk"          value={clientData.summary.atRiskCount}    color="text-red-600" />
                <StatCard label="Renewals Due"     value={clientData.summary.renewalsDue}    color="text-amber-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="card">
                  <h3 className="text-sm font-semibold mb-4">Health Distribution</h3>
                  <div className="h-44 flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: ['Green', 'Amber', 'Red'],
                        datasets: [{
                          data: [
                            clientData.summary.healthDistribution.green,
                            clientData.summary.healthDistribution.amber,
                            clientData.summary.healthDistribution.red
                          ],
                          backgroundColor: [COLORS.green, COLORS.amber, COLORS.red],
                          borderWidth: 0
                        }]
                      }}
                      options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                    />
                  </div>
                </div>

                <div className="card lg:col-span-2">
                  <h3 className="text-sm font-semibold mb-3 text-red-600">⚠ At-Risk Clients</h3>
                  {clientData.atRiskClients.length === 0
                    ? <p className="text-sm text-gray-400 py-6 text-center">No at-risk clients 🎉</p>
                    : <div className="space-y-2">
                        {clientData.atRiskClients.map(c => (
                          <div key={c._id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{c.company}</p>
                              <p className="text-xs text-gray-500">AM: {c.assignedAM?.name || '—'}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${healthBg(c.healthScore?.overall || 0)}`}>
                              {c.healthScore?.overall || 0}/10
                            </span>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>

              {clientData.upcomingRenewals.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold mb-3">Upcoming Renewals (30 days)</h3>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead><tr><th>Client</th><th>AM</th><th>Renewal Date</th><th>Days Left</th><th>Value/mo</th></tr></thead>
                      <tbody>
                        {clientData.upcomingRenewals.map(c => (
                          <tr key={c._id}>
                            <td className="font-medium">{c.company}</td>
                            <td>{c.assignedAM?.name || '—'}</td>
                            <td>{formatDate(c.renewalDate)}</td>
                            <td><span className={`font-semibold ${c.daysToRenewal <= 7 ? 'text-red-600' : 'text-amber-600'}`}>{c.daysToRenewal}d</span></td>
                            <td className="text-green-600 font-semibold">{formatINR(c.contractValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TEAM PERFORMANCE ───────────────────────────────────────────── */}
          {activeReport === 'team' && teamData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Tasks"      value={teamData.summary.totalTasks}       icon={Activity} />
                <StatCard label="Completed"        value={teamData.summary.completedTasks}   color="text-green-600" />
                <StatCard label="Delayed"          value={teamData.summary.delayedTasks}     color="text-red-600" />
                <StatCard label="Completion Rate"  value={`${teamData.summary.overallCompletionRate}%`}
                  color={teamData.summary.overallCompletionRate >= 85 ? 'text-green-600' : 'text-amber-600'} />
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold mb-4">Productivity Leaderboard</h3>
                <div className="space-y-3">
                  {teamData.team.slice(0, 10).map((member, idx) => (
                    <div key={member.user._id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-700'
                        : idx === 1 ? 'bg-gray-100 text-gray-600'
                        : idx === 2 ? 'bg-orange-100 text-orange-700'
                        : 'bg-surface-secondary text-gray-500'
                      }`}>{idx + 1}</span>
                      <Avatar user={member.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-800">{member.user.name}</p>
                          <span className="text-xs font-bold text-brand-navy">{member.productivityScore}%</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-1.5">
                          <span>✅ {member.completed}/{member.total}</span>
                          <span>⏰ {member.onTimeRate}% on time</span>
                          <span>⏱ {Number(member.totalHours).toFixed(1)}h logged</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-brand-navy" style={{ width: `${member.productivityScore}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {teamData.departments.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold mb-4">Department Performance</h3>
                  <div className="h-52">
                    <Bar
                      data={{
                        labels: teamData.departments.map(d => d.dept?.name),
                        datasets: [
                          { label: 'Done',    data: teamData.departments.map(d => d.done),    backgroundColor: COLORS.green + 'cc', borderRadius: 4 },
                          { label: 'Delayed', data: teamData.departments.map(d => d.delayed), backgroundColor: COLORS.red   + 'cc', borderRadius: 4 }
                        ]
                      }}
                      options={{ ...CHART_OPTS, plugins: { legend: { display: true, position: 'top' } } }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── OPERATIONAL ────────────────────────────────────────────────── */}
          {activeReport === 'operational' && opsData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Active Projects"  value={opsData.summary.activeProjects}  color="text-green-600" icon={TrendingUp} />
                <StatCard label="Delayed Projects" value={opsData.summary.delayedProjects} color="text-red-600" />
                <StatCard label="Pending Tasks"    value={opsData.summary.pendingTasks} />
                <StatCard label="Avg Completion"   value={`${opsData.summary.avgTaskCompletionTime}d`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card">
                  <h3 className="text-sm font-semibold mb-4">Projects by Status</h3>
                  <div className="h-48 flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: opsData.projectsByStatus.map(s => slugToLabel(s.status)),
                        datasets: [{ data: opsData.projectsByStatus.map(s => s.count), backgroundColor: Object.values(COLORS), borderWidth: 0 }]
                      }}
                      options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}
                    />
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold mb-4">Tasks by Status</h3>
                  <div className="h-48">
                    <Bar
                      data={{
                        labels: opsData.tasksByStatus.map(s => slugToLabel(s.status)),
                        datasets: [{ data: opsData.tasksByStatus.map(s => s.count), backgroundColor: ['#9CA3AF', COLORS.blue, COLORS.amber, COLORS.green, '#10B981', COLORS.red], borderRadius: 4 }]
                      }}
                      options={CHART_OPTS}
                    />
                  </div>
                </div>
              </div>

              {opsData.workloadDistribution.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold mb-4">Current Workload Distribution</h3>
                  <div className="space-y-2.5">
                    {opsData.workloadDistribution.slice(0, 8).map(w => (
                      <div key={w.user._id} className="flex items-center gap-3">
                        <Avatar user={w.user} size="sm" />
                        <span className="text-sm text-gray-700 w-32 flex-shrink-0 truncate">{w.user.name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${w.count > 10 ? 'bg-red-500' : w.count > 5 ? 'bg-amber-500' : 'bg-brand-navy'}`}
                            style={{ width: `${Math.min(100, (w.count / 15) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-16 text-right flex-shrink-0">{w.count} tasks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
