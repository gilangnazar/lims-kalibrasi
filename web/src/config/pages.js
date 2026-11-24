// Pages the web app has, keyed by the API menu code (api/src/config/menus.js).
// The sidebar shows an API menu entry only when its page exists here, so menus the API already
// knows (e.g. a menu added in the API before its page) stay hidden until their page is built.
export const PAGES = Object.freeze({
  orders: { path: '/orders', icon: 'ph ph-clipboard-text' },
  'contract-reviews': { path: '/contract-reviews', icon: 'ph ph-seal-check' },
  intake: { path: '/intake', icon: 'ph ph-package' },
  assignments: { path: '/assignments', icon: 'ph ph-user-switch' },
  equipment: { path: '/equipment', icon: 'ph ph-wrench' },
  customers: { path: '/customers', icon: 'ph ph-buildings' },
  'standard-instruments': { path: '/standard-instruments', icon: 'ph ph-scales' },
  methods: { path: '/methods', icon: 'ph ph-list-checks' },
  users: { path: '/users', icon: 'ph ph-user-gear' },
  roles: { path: '/roles', icon: 'ph ph-shield-check' },
  menus: { path: '/menus', icon: 'ph ph-list-dashes' },
  'audit-trail': { path: '/audit-trail', icon: 'ph ph-clock-counter-clockwise' }
});
