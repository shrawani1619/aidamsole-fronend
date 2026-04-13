/** Keep in sync with backend utils/modulePermissions.js */

export const MODULE_IDS = [
  'dashboard',
  'clients',
  'projects',
  'tasks',
  'departments',
  'team',
  'reports',
  'finance',
  'chat',
  'trash',
  'history',
  'admins',
];

export const MODULE_LABELS = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  projects: 'Projects',
  tasks: 'Tasks',
  departments: 'Departments',
  team: 'Team & users',
  reports: 'Reports',
  finance: 'Finance',
  chat: 'Chat',
  trash: 'Trash',
  history: 'Activity history',
  admins: 'Administrators',
};

export const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
};

/** Dashboard “widgets” — field-level visibility (e.g. hide MRR for some roles) */
export const DASHBOARD_FIELD_KEYS = [
  'mrr',
  'activeClients',
  'thisMonthRevenue',
  'delayedTasks',
  'clientHealth',
  'deptPerformance',
  'riskClients',
  'topClients',
  'revenueHistory',
];

export const DASHBOARD_FIELD_LABELS = {
  mrr: 'MRR (recurring revenue)',
  activeClients: 'Active clients KPI',
  thisMonthRevenue: 'This month revenue',
  delayedTasks: 'Delayed tasks KPI',
  clientHealth: 'Client health strip',
  deptPerformance: 'Department performance',
  riskClients: 'At-risk clients list',
  topClients: 'Top clients list',
  revenueHistory: 'Revenue history chart',
};

/** Reports page tabs — must stay in sync with ReportsPage tab `value` */
export const REPORTS_FIELD_KEYS = ['financial', 'client', 'team', 'operational'];

export const REPORTS_FIELD_LABELS = {
  financial: 'Financial report (needs Finance access)',
  client: 'Client performance',
  team: 'Team performance',
  operational: 'Operational',
};
