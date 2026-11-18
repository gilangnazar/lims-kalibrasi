// `permission` keys live in config/permissions.js; items the user can't access are hidden.
const masterData = {
  id: 'master-data',
  title: 'Master Data',
  type: 'group',
  children: [
    {
      id: 'master-data-customers',
      title: 'Pelanggan',
      type: 'item',
      icon: 'ph ph-buildings',
      url: '/customers',
      permission: 'customers.read'
    },
    {
      id: 'master-data-standard-instruments',
      title: 'Standard Instrument',
      type: 'item',
      icon: 'ph ph-scales',
      url: '/standard-instruments',
      permission: 'standard-instruments.read'
    },
    {
      id: 'master-data-methods',
      title: 'Metode Kalibrasi',
      type: 'item',
      icon: 'ph ph-list-checks',
      url: '/methods',
      permission: 'methods.read'
    }
  ]
};

export default masterData;
