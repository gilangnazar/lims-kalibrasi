import { PAGES } from 'config/pages';

/**
 * Sidebar items from the API menu tree (user.menus: groups → pages the user may view, with the
 * Admin's labels, order and visibility). Pages the web doesn't have yet are skipped; empty groups go.
 */
export function buildMenuItems(apiMenus = []) {
  const items = apiMenus
    .map((group) => ({
      id: group.code,
      title: group.label,
      type: 'group',
      children: group.children
        .filter((child) => PAGES[child.code])
        .map((child) => ({ id: child.code, title: child.label, type: 'item', icon: PAGES[child.code].icon, url: PAGES[child.code].path }))
    }))
    .filter((group) => group.children.length);
  return { items };
}
