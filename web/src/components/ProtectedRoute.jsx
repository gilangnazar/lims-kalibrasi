import { Navigate } from 'react-router-dom';

import Loader from 'components/Loader';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';

/**
 * Gates a route. Pass `permission` (preferred, from config/permissions) or `requiredRoles`.
 * UX only — the API enforces the same rules.
 */
export default function ProtectedRoute({ children, permission, requiredRoles = [] }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const allowed = permission ? can(user, permission) : requiredRoles.length === 0 || requiredRoles.includes(user?.role);
  if (!allowed) return <Navigate to="/" replace />;

  return children;
}
