import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Building2,
  BarChart3, IndianRupee, MessageSquare, LogOut,
  ChevronLeft, ChevronRight, UserCircle, User, Menu, X, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

// All nav items — visibility controlled by canSee()
const navItems = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   module: 'dashboard' },
  { path: '/clients',     icon: UserCircle,      label: 'Clients',     module: 'clients' },
  { path: '/projects',    icon: FolderKanban,    label: 'Projects',    module: 'projects' },
  { path: '/tasks',       icon: CheckSquare,     label: 'Tasks',       module: 'tasks' },
  { path: '/departments', icon: Building2,       label: 'Departments', module: 'departments' },
  { path: '/team',        icon: Users,           label: 'Team',        module: 'team' },
  { path: '/permissions', icon: Shield,          label: 'Permissions', adminOnly: true },
  { path: '/reports',     icon: BarChart3,       label: 'Reports',     module: 'reports' },
  { path: '/finance',     icon: IndianRupee,      label: 'Finance',     module: 'finance' },
  { path: '/chat',        icon: MessageSquare,   label: 'Chat',        module: 'chat' },
];

export default function Sidebar() {
  const { user, logout, isAdmin, isManager, canModule } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Nav visibility: module view ACL + legacy admin/manager flags
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.managerUp) return isAdmin || isManager;
    if (item.module) return canModule(item.module, 'view');
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-6 bg-white border-b border-gray-200/90 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src={LOGO_SRC}
          alt="AiDamsole"
          className={`object-contain flex-shrink-0 ${collapsed ? 'w-12 h-12' : 'h-14 w-auto max-w-[min(100%,260px)]'}`}
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
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <User size={18} />
          {!collapsed && <span>Profile</span>}
        </NavLink>

        {/* User pill */}
        <NavLink
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg mt-1 hover:bg-white/5 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <Avatar user={user} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <span className="mt-1 inline-flex max-w-full items-center rounded-md bg-blue-500 px-2 py-0.5 text-[10px] font-semibold capitalize text-white shadow-sm truncate">
                {user?.role?.replace(/_/g, ' ') || '—'}
              </span>
            </div>
          )}
        </NavLink>

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
          className="absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-card flex items-center justify-center text-gray-500 hover:text-brand-navy transition-colors"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>
    </>
  );
}
