import { useMemo } from 'react';

import { useAuth } from 'hooks/useAuth';
import { buildMenuItems } from 'menu-items';

/** The signed-in user's sidebar, rebuilt whenever /auth/me is refreshed. */
export function useMenuItems() {
  const { user } = useAuth();
  return useMemo(() => buildMenuItems(user?.menus), [user]);
}
