import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Building2,
  BarChart3, IndianRupee, MessageSquare,
  ChevronLeft, ChevronRight, UserCircle, Menu, X, Shield, Trash2, History, UserCog
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

// All nav items — visibility controlled by canSee()
const navItems = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   module: 'dashboard' },
  { path: '/clients',     icon: UserCircle,      label: 'Clients',     module: 'clients' },
  { path: '/projects',    icon: FolderKanban,    label: 'Projects',    module: 'projects' },
  { path: '/tasks',       icon: CheckSquare,     label: 'Tasks',       module: 'tasks' },
  { path: '/departments', icon: Building2,       label: 'Departments', module: 'departments' },
  { path: '/team',        icon: Users,           label: 'Team',        module: 'team' },
  { path: '/admins',      icon: UserCog,          label: 'Admins',      module: 'admins', superAdminOnly: true },
  { path: '/permissions', icon: Shield,          label: 'Permissions', adminOnly: true },
  { path: '/reports',     icon: BarChart3,       label: 'Reports',     module: 'reports' },
  { path: '/finance',     icon: IndianRupee,      label: 'Finance',     module: 'finance' },
  { path: '/chat',        icon: MessageSquare,   label: 'Chat',        module: 'chat' },
  { path: '/trash',       icon: Trash2,          label: 'Trash',       module: 'trash' },
  { path: '/history',     icon: History,         label: 'History',     module: 'history' },
];

export default function Sidebar() {
  const { isAdmin, isManager, isSuperAdmin, canModule } = useAuth();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Nav visibility: module view ACL + legacy admin/manager flags
  const visibleItems = navItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin && canModule(item.module, 'view');
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
