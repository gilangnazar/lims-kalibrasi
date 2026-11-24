// Pages the web app has, keyed by the API menu code (api/src/config/menus.js).
// The sidebar shows an API menu entry only when its page exists here, so menus the API already
// knows (e.g. audit-trail before step 03) stay hidden until their page is built.
export const PAGES = Object.freeze({
  customers: { path: '/customers', icon: 'ph ph-buildings' },
  'standard-instruments': { path: '/standard-instruments', icon: 'ph ph-scales' },
  methods: { path: '/methods', icon: 'ph ph-list-checks' },
  users: { path: '/users', icon: 'ph ph-user-gear' },
  roles: { path: '/roles', icon: 'ph ph-shield-check' },
  menus: { path: '/menus', icon: 'ph ph-list-dashes' }
});
