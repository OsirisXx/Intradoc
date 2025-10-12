import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { FunctionalRole } from '../../types/index';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: FunctionalRole;
  allowedRoles?: FunctionalRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && user.FUNCTIONAL_ROLE !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    return <Navigate to={getRoleRedirectPath(user.FUNCTIONAL_ROLE)} replace />;
  }

  // Check if user role is in allowed roles
  if (allowedRoles && !allowedRoles.includes(user.FUNCTIONAL_ROLE)) {
    // Redirect to appropriate dashboard based on user role
    return <Navigate to={getRoleRedirectPath(user.FUNCTIONAL_ROLE)} replace />;
  }

  return <>{children}</>;
};

// Helper function to get the appropriate redirect path based on role
const getRoleRedirectPath = (role: FunctionalRole): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'staff':
      return '/staff';
    case 'section_unit_head':
      return '/section-unit-head/task-assignment';
    case 'division_manager':
      return '/division-manager/review';
    case 'regional_director':
      return '/regional-director/review';
    default:
      return '/staff';
  }
};

