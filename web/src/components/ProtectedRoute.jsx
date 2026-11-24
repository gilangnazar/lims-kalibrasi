import { Navigate } from 'react-router-dom';

import Loader from 'components/Loader';
import { can } from 'config/permissions';
import { useAuth } from 'hooks/useAuth';

/**
 * Gates a route: logged in, and — when `menu` is given — allowed to `action` (default view) on it.
 * `anyOf` (menu codes) passes when the user can view at least one of them (shared pages).
 * UX only — the API enforces the same permission grid.
 */
export default function ProtectedRoute({ children, menu, action = 'view', anyOf }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (menu && !can(user, menu, action)) return <Navigate to="/" replace />;
  if (anyOf && !anyOf.some((code) => can(user, code, 'view'))) return <Navigate to="/" replace />;

  return children;
}
