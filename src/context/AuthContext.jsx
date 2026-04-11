import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('aidamsole_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aidamsole_token');
    if (token) {
      authApi.me()
        .then(res => {
          const u = res.data.user;
          setUser(u);
          localStorage.setItem('aidamsole_user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('aidamsole_token');
          localStorage.removeItem('aidamsole_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('aidamsole_token', token);
    localStorage.setItem('aidamsole_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aidamsole_token');
    localStorage.removeItem('aidamsole_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const u = { ...prev, ...updates };
      localStorage.setItem('aidamsole_user', JSON.stringify(u));
      return u;
    });
  }, []);

  // Role helpers — super_admin always has full access
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin      = user?.role === 'super_admin' || user?.role === 'admin';
  const isManager    = user?.role === 'department_manager';
  // canManage: super_admin, admin, and dept_manager can all create/edit
  const canManage    = isAdmin || isManager;

  const canModule = useCallback((module, action) => {
    if (user?.role === 'super_admin' || user?.role === 'admin') return true;
    return user?.effectiveModulePermissions?.[module]?.[action] === true;
  }, [user]);

  /** Field-level flags on any module (dashboard KPIs, report tabs, etc.). Missing field = allowed when module view is true. */
  const canViewField = useCallback((module, fieldKey) => {
    if (user?.role === 'super_admin' || user?.role === 'admin') return true;
    const m = user?.effectiveModulePermissions?.[module];
    if (!m?.view) return false;
    if (m.fields?.[fieldKey] === false) return false;
    return true;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, updateUser,
      isSuperAdmin, isAdmin, isManager, canManage,
      canModule, canViewField,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
