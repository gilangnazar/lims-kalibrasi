import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import Loadable from 'components/Loadable';
import ProtectedRoute from 'components/ProtectedRoute';
import AuthLayout from 'layout/Auth';
import DashboardLayout from 'layout/Dashboard';

const LoginPage = Loadable(lazy(() => import('views/auth/login/Login')));
const HomePage = Loadable(lazy(() => import('views/Home')));
const NotFoundPage = Loadable(lazy(() => import('views/NotFound')));
const UserList = Loadable(lazy(() => import('features/users/UserList')));
const CustomerList = Loadable(lazy(() => import('features/customers/CustomerList')));
const StandardInstrumentList = Loadable(lazy(() => import('features/standard-instruments/StandardInstrumentList')));
const MethodList = Loadable(lazy(() => import('features/methods/MethodList')));

// One entry per page. `permission` keys live in config/permissions.js.
const pages = [
  { path: 'customers', permission: 'customers.read', element: <CustomerList /> },
  { path: 'standard-instruments', permission: 'standard-instruments.read', element: <StandardInstrumentList /> },
  { path: 'methods', permission: 'methods.read', element: <MethodList /> },
  { path: 'users', permission: 'users.read', element: <UserList /> }
];

const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      children: [{ path: 'login', element: <LoginPage /> }]
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <HomePage /> },
        ...pages.map(({ path, permission, element }) => ({
          path,
          element: <ProtectedRoute permission={permission}>{element}</ProtectedRoute>
        })),
        { path: '*', element: <NotFoundPage /> }
      ]
    }
  ],
  { basename: import.meta.env.VITE_APP_BASE_NAME }
);

export default router;
