import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

// project-imports
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import { useAuth } from 'hooks/useAuth';

// ==============================|| NAVIGATION - GROUP ||============================== //

export default function NavGroup(props) {
  const { item, lastItem, remItems, lastItemId, setSelectedID, setSelectedItems, selectedItems, setSelectedLevel, selectedLevel } = props;
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [currentItem, setCurrentItem] = useState(item);

  //  Combine items if this is the last grouped item
  useEffect(() => {
    if (lastItem && item.id === lastItemId) {
      const children = remItems.flatMap((ele) => ele.children ?? []);
      setCurrentItem({ ...item, children });
    } else {
      setCurrentItem(item);
    }
  }, [item, lastItem, lastItemId, remItems]);

  //  Helper: Check if user has access to menu item
  const hasAccess = useCallback(
    (menuItem) => {
      // If no roles specified, everyone can access
      if (!menuItem.roles || menuItem.roles.length === 0) {
        return true;
      }
      // Check if user's role is in the allowed roles
      return menuItem.roles.includes(user?.role);
    },
    [user?.role]
  );

  //  Helper: Recursively check if route matches
  const findMatchingChild = useCallback(
    (children, parentId) => {
      children.forEach((child) => {
        if (child.children?.length) findMatchingChild(child.children, parentId);
        const path = child.link || child.url;
        if (path && matchPath({ path, end: true }, pathname)) {
          setSelectedID(parentId);
        }
      });
    },
    [pathname, setSelectedID]
  );

  //  On-load selection
  useEffect(() => {
    const children = currentItem.children ?? [];
    children.forEach((child) => {
      if (child.children?.length) findMatchingChild(child.children, currentItem.id);
      const path = child.link || child.url;
      if (path && matchPath({ path, end: true }, pathname)) {
        setSelectedID(currentItem.id);
      }
    });
  }, [pathname, currentItem, findMatchingChild, setSelectedID]);

  //  Memoized children render
  const navCollapse = useMemo(() => {
    if (!currentItem.children) return null;

    return currentItem.children
      .filter((menuItem) => hasAccess(menuItem)) // Filter by role
      .map((menuItem, index) => {
        const key = menuItem.id || `${menuItem.type}-${index}`;

        switch (menuItem.type) {
          case 'collapse':
            return (
              <NavCollapse
                key={key}
                menu={menuItem}
                setSelectedItems={setSelectedItems}
                setSelectedLevel={setSelectedLevel}
                selectedLevel={selectedLevel}
                selectedItems={selectedItems}
                level={1}
                parentId={currentItem.id}
              />
            );
          case 'item':
            return <NavItem key={key} item={menuItem} level={1} />;
          default:
            return (
              <h6 key={`fix-${index}`} className="align-center text-danger">
                Fix - Group Collapse or Items
              </h6>
            );
        }
      });
  }, [currentItem, selectedItems, selectedLevel, setSelectedItems, setSelectedLevel, hasAccess]);

  return (
    <Fragment>
      <li className="pc-item pc-caption" key={item.id}>
        <label>{item.title}</label>
      </li>
      {navCollapse}
    </Fragment>
  );
}
