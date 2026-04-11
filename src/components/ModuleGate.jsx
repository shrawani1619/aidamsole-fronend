import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Blocks the route when the user lacks view access to a module.
 * super_admin / admin always pass via canModule.
 */
export default function ModuleGate({ module, children }) {
  const { loading, canModule } = useAuth();
  if (loading) return null;
  if (!canModule(module, 'view')) {
    return <Navigate to="/profile" replace />;
  }
  return children;
}
