import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import ProtectedRoute from 'components/ProtectedRoute';

// render - dashboard pages
const UserList = Loadable(lazy(() => import('views/administrations/UserList.jsx')));

// ==============================|| NAVIGATION ROUTING ||============================== //

const MasterDataRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          path: 'users',
          element: (
            <ProtectedRoute requiredRoles={['Admin']}>
              <UserList />
            </ProtectedRoute>
          )
        }
      ]
    }
  ]
};

export default MasterDataRoutes;
