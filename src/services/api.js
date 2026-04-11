import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('aidamsole_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  err => Promise.reject(err)
);

// Global response handler — only redirect on 401, never auto-block 403
api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const message = err.response?.data?.message || 'Something went wrong';

    if (status === 401) {
      // Token expired or invalid — force logout
      localStorage.removeItem('aidamsole_token');
      localStorage.removeItem('aidamsole_user');
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // 403 should never happen for super_admin (backend fixed),
    // but if it does for other roles, show message without redirect
    if (status === 403) {
      toast.error('You do not have permission for this action.');
      return Promise.reject(err);
    }

    // Don't toast on 404 — handled per-request
    if (status !== 404) {
      toast.error(message);
    }

    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:         (data) => api.post('/auth/login', data),
  me:            ()     => api.get('/auth/me'),
  updatePassword:(data) => api.put('/auth/update-password', data),
  updateProfile: (data) => api.put('/auth/update-profile', data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:          (params) => api.get('/users', { params }),
  create:        (data)   => api.post('/users', data),
  get:           (id)     => api.get(`/users/${id}`),
  update:        (id, data) => api.put(`/users/${id}`, data),
  delete:        (id)     => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
};

// ── Departments ───────────────────────────────────────────────────────────────
export const departmentsApi = {
  list:         ()           => api.get('/departments'),
  create:       (data)       => api.post('/departments', data),
  get:          (id)         => api.get(`/departments/${id}`),
  update:       (id, data)   => api.put(`/departments/${id}`, data),
  addMember:    (id, data)   => api.post(`/departments/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/departments/${id}/members/${userId}`),
  stats:        (id)         => api.get(`/departments/${id}/stats`),
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientsApi = {
  list:         (params)   => api.get('/clients', { params }),
  create:       (data)     => api.post('/clients', data),
  get:          (id)       => api.get(`/clients/${id}`),
  update:       (id, data) => api.put(`/clients/${id}`, data),
  updateHealth: (id, data) => api.put(`/clients/${id}/health-score`, data),
  delete:       (id)       => api.delete(`/clients/${id}`),
  timeline:     (id)       => api.get(`/clients/${id}/timeline`),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list:   (params)   => api.get('/projects', { params }),
  create: (data)     => api.post('/projects', data),
  get:    (id)       => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id)       => api.delete(`/projects/${id}`),
  tasks:  (id)       => api.get(`/projects/${id}/tasks`),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list:          (params)               => api.get('/tasks', { params }),
  create:        (data)                 => api.post('/tasks', data),
  get:           (id)                   => api.get(`/tasks/${id}`),
  update:        (id, data)             => api.put(`/tasks/${id}`, data),
  delete:        (id)                   => api.delete(`/tasks/${id}`),
  twoEyeApprove: (id)                   => api.put(`/tasks/${id}/two-eye-approve`),
  addComment:    (id, data)             => api.post(`/tasks/${id}/comments`, data),
  logTime:       (id, data)             => api.post(`/tasks/${id}/time-log`, data),
  updateSubtask: (taskId, subtaskId, data) => api.put(`/tasks/${taskId}/subtask/${subtaskId}`, data),
};

// ── Finance ───────────────────────────────────────────────────────────────────
export const financeApi = {
  summary:      ()           => api.get('/finance/summary'),
  revenueChart: (params)     => api.get('/finance/revenue-chart', { params }),
  list:         (params)     => api.get('/finance/invoices', { params }),
  create:       (data)       => api.post('/finance/invoices', data),
  get:          (id)         => api.get(`/finance/invoices/${id}`),
  update:       (id, data)   => api.put(`/finance/invoices/${id}`, data),
  delete:       (id)         => api.delete(`/finance/invoices/${id}`),
  markPaid:     (id, data)   => api.post(`/finance/invoices/${id}/payment`, data),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  financial:         (params) => api.get('/reports/financial', { params }),
  clientPerformance: (params) => api.get('/reports/client-performance', { params }),
  teamPerformance:   (params) => api.get('/reports/team-performance', { params }),
  operational:       (params) => api.get('/reports/operational', { params }),
  superAdminInsights:()       => api.get('/reports/super-admin-insights'),
  share:             (data)   => api.post('/reports/share', data),
  getShared:         (token)  => api.get(`/reports/shared/${token}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get:         () => api.get('/dashboard'),
  healthScores:() => api.get('/dashboard/health-scores'),
  standup:     () => api.get('/dashboard/standup'),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  users:              ()         => api.get('/chat/users'),
  conversations:      ()         => api.get('/chat/conversations'),
  createConversation: (data)     => api.post('/chat/conversations', data),
  messages:           (id, params) => api.get(`/chat/conversations/${id}/messages`, { params }),
  sendMessage:        (id, data) => api.post(`/chat/conversations/${id}/messages`, data),
  deleteMessage:      (id)       => api.delete(`/chat/messages/${id}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list:       (params) => api.get('/notifications', { params }),
  markRead:   (id)     => api.put(`/notifications/${id}/read`),
  markAllRead:()       => api.put('/notifications/mark-all-read'),
  delete:     (id)     => api.delete(`/notifications/${id}`),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  single:   (formData) => api.post('/upload/single',   formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  multiple: (formData) => api.post('/upload/multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
