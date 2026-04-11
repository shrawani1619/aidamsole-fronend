import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Building2,
  BarChart3, DollarSign, MessageSquare, Settings, LogOut,
  ChevronLeft, ChevronRight, UserCircle, Menu, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

// All nav items — visibility controlled by canSee()
const navItems = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
  { path: '/clients',     icon: UserCircle,      label: 'Clients'     },
  { path: '/projects',    icon: FolderKanban,    label: 'Projects'    },
  { path: '/tasks',       icon: CheckSquare,     label: 'Tasks'       },
  { path: '/departments', icon: Building2,       label: 'Departments', adminOnly: true },
  { path: '/team',        icon: Users,           label: 'Team',        managerUp: true },
  { path: '/reports',     icon: BarChart3,       label: 'Reports'     },
  { path: '/finance',     icon: DollarSign,      label: 'Finance',    adminOnly: true },
  { path: '/chat',        icon: MessageSquare,   label: 'Chat'        },
];

export default function Sidebar() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Determine which items this user can see
  const visibleItems = navItems.filter(item => {
    if (item.adminOnly) return isAdmin;          // super_admin + admin
    if (item.managerUp) return isAdmin || isManager; // + dept_manager
    return true;                                  // everyone
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src={LOGO_SRC}
          alt="AiDamsole"
          className={`object-contain flex-shrink-0 ${collapsed ? 'w-8 h-8' : 'h-8 w-auto max-w-[150px]'}`}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <NavLink
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {/* User pill */}
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg mt-1 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar user={user} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-gray-400 text-xs truncate capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-brand-navy text-white rounded-lg shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-brand-navy z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col bg-brand-navy h-screen sticky top-0 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-card flex items-center justify-center text-gray-500 hover:text-brand-navy transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>
    </>
  );
}
