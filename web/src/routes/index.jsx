import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import Loadable from 'components/Loadable';
import ProtectedRoute from 'components/ProtectedRoute';
import { PAGES } from 'config/pages';
import AuthLayout from 'layout/Auth';
import DashboardLayout from 'layout/Dashboard';

const LoginPage = Loadable(lazy(() => import('views/auth/login/Login')));
const HomePage = Loadable(lazy(() => import('views/Home')));
const NotFoundPage = Loadable(lazy(() => import('views/NotFound')));

// One component per menu code in config/pages.js; the route needs `view` on that menu.
const PAGE_COMPONENTS = {
  customers: Loadable(lazy(() => import('features/customers/CustomerList'))),
  'standard-instruments': Loadable(lazy(() => import('features/standard-instruments/StandardInstrumentList'))),
  methods: Loadable(lazy(() => import('features/methods/MethodList'))),
  users: Loadable(lazy(() => import('features/users/UserList'))),
  roles: Loadable(lazy(() => import('features/roles/RoleList'))),
  menus: Loadable(lazy(() => import('features/menus/MenuManagement'))),
  'audit-trail': Loadable(lazy(() => import('features/audit-trail/AuditTrail')))
};

const pageRoutes = Object.entries(PAGES).map(([menu, { path }]) => {
  const Page = PAGE_COMPONENTS[menu];
  return {
    path: path.replace(/^\//, ''),
    element: (
      <ProtectedRoute menu={menu}>
        <Page />
      </ProtectedRoute>
    )
  };
});

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
      children: [{ index: true, element: <HomePage /> }, ...pageRoutes, { path: '*', element: <NotFoundPage /> }]
    }
  ],
  { basename: import.meta.env.VITE_APP_BASE_NAME }
);

export default router;
