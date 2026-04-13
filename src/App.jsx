import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClientsPage from './pages/clients/ClientsPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import TasksPage from './pages/tasks/TasksPage';
import TaskDetailPage from './pages/tasks/TaskDetailPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import ReportsPage from './pages/reports/ReportsPage';
import FinancePage from './pages/finance/FinancePage';
import ChatPage from './pages/chat/ChatPage';
import TeamPage from './pages/team/TeamPage';
import TrashPage from './pages/trash/TrashPage';
import HistoryPage from './pages/history/HistoryPage';
import AdminsPage from './pages/admins/AdminsPage';
import PermissionsPage from './pages/permissions/PermissionsPage';
import ProfilePage from './pages/profile/ProfilePage';
import ModuleGate from './components/ModuleGate';
import { Spinner } from './components/ui';

// Single PrivateRoute — just checks login. NO role-based redirects.
// Super admin must NEVER be blocked from any route.
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AiDamsole" className="h-10 w-auto object-contain animate-pulse" />
          <Spinner size="md" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          {/* Reset link from email — no PublicRoute so logged-in users can still complete reset */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* All protected routes — NO adminOnly gates on any route */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <SocketProvider>
                  <AppLayout />
                </SocketProvider>
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={<ModuleGate module="dashboard"><DashboardPage /></ModuleGate>} />
            <Route path="clients"     element={<ModuleGate module="clients"><ClientsPage /></ModuleGate>} />
            <Route path="projects"    element={<ModuleGate module="projects"><ProjectsPage /></ModuleGate>} />
            <Route path="tasks/:taskId" element={<ModuleGate module="tasks"><TaskDetailPage /></ModuleGate>} />
            <Route path="tasks"       element={<ModuleGate module="tasks"><TasksPage /></ModuleGate>} />
            <Route path="departments" element={<ModuleGate module="departments"><DepartmentsPage /></ModuleGate>} />
            <Route path="team"        element={<ModuleGate module="team"><TeamPage /></ModuleGate>} />
            <Route path="trash"       element={<ModuleGate module="trash"><TrashPage /></ModuleGate>} />
            <Route path="history"     element={<ModuleGate module="history"><HistoryPage /></ModuleGate>} />
            <Route path="admins"      element={<ModuleGate module="admins"><AdminsPage /></ModuleGate>} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="reports"     element={<ModuleGate module="reports"><ReportsPage /></ModuleGate>} />
            <Route path="finance"     element={<ModuleGate module="finance"><FinancePage /></ModuleGate>} />
            <Route path="chat"        element={<ModuleGate module="chat"><ChatPage /></ModuleGate>} />
            <Route path="profile"     element={<ProfilePage />} />
            <Route path="settings"    element={<Navigate to="/profile" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
