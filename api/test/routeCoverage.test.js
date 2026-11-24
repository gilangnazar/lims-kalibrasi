const { mounts } = require('../src/app');

// Walks every mounted router and fails if any route has no requirePermission check.
// (Auth routes are public/own-account and mounted separately; health is public.)
function routesOf(router) {
  return router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      permission: layer.route.stack.map((entry) => entry.handle.permission).find(Boolean)
    }));
}

describe('route coverage', () => {
  it('has a permission check on every protected route', () => {
    const routes = mounts.flatMap(([base, router]) => routesOf(router).map((route) => ({ ...route, base })));
    expect(routes.length).toBeGreaterThan(20);
    const missing = routes.filter((route) => !route.permission).map((route) => `${route.methods} ${route.base}${route.path}`);
    expect(missing).toEqual([]);
  });
});
