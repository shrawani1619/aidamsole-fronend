import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClientsPage from './pages/clients/ClientsPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import TasksPage from './pages/tasks/TasksPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import ReportsPage from './pages/reports/ReportsPage';
import FinancePage from './pages/finance/FinancePage';
import ChatPage from './pages/chat/ChatPage';
import TeamPage from './pages/team/TeamPage';
import SettingsPage from './pages/settings/SettingsPage';
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
            <Route path="dashboard"   element={<DashboardPage />} />
            <Route path="clients"     element={<ClientsPage />} />
            <Route path="projects"    element={<ProjectsPage />} />
            <Route path="tasks"       element={<TasksPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="team"        element={<TeamPage />} />
            <Route path="reports"     element={<ReportsPage />} />
            <Route path="finance"     element={<FinancePage />} />
            <Route path="chat"        element={<ChatPage />} />
            <Route path="settings"    element={<SettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
