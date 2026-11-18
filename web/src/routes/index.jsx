import { createBrowserRouter } from 'react-router-dom';

// project-imports
import MasterDataRoutes from './MasterDataRoutes';
import AuthRoutes from './AuthRoutes';
import AdministrationRoutes from './AdministrationRoutes';

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter([MasterDataRoutes, AuthRoutes, AdministrationRoutes], {
  basename: import.meta.env.VITE_APP_BASE_NAME
});

export default router;
