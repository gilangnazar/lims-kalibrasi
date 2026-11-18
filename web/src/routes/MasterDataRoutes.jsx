import { lazy } from 'react';

// project-imports
import Loadable from 'components/Loadable';
import DashboardLayout from 'layout/Dashboard';
import ProtectedRoute from 'components/ProtectedRoute';

// render - dashboard pages
const StandardInstrumentList = Loadable(lazy(() => import('views/master-data/standard-instruments/StandardInstrumentList.jsx')));
const CustomerList = Loadable(lazy(() => import('views/master-data/customers/CustomerList.jsx')));
const MethodList = Loadable(lazy(() => import('views/master-data/methods/MethodList.jsx')));

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
          path: 'standard-instruments',
          element: (
            <ProtectedRoute requiredRoles={['Admin']}>
              <StandardInstrumentList />
            </ProtectedRoute>
          )
        },
        {
          path: 'customers',
          element: (
            <ProtectedRoute requiredRoles={['Admin']}>
              <CustomerList />
            </ProtectedRoute>
          )
        },
        {
          path: 'methods',
          element: (
            <ProtectedRoute requiredRoles={['Admin']}>
              <MethodList />
            </ProtectedRoute>
          )
        }
      ]
    }
  ]
};

export default MasterDataRoutes;
