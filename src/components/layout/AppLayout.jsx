import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/departments': 'Departments',
  '/team': 'Team',
  '/reports': 'Reports',
  '/finance': 'Finance',
  '/chat': 'Chat',
  '/profile': 'Profile',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = pageTitles[base] || 'AiDamsole CRM';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
