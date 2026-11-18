const masterData = {
  id: 'master-data',
  title: 'Master Data',
  type: 'group',
  children: [
    {
      id: 'master-data-customers',
      title: 'Master Pelanggan',
      type: 'item',
      icon: 'ph ph-users',
      url: '/customers',
      roles: ['Admin'] // Match the route
    },
    {
      id: 'master-data-standard-instruments',
      title: 'Master Standard Instrument',
      type: 'item',
      icon: 'ph ph-list',
      url: '/standard-instruments',
      roles: ['Admin'] // Match the route
    },
    {
      id: 'master-data-methods',
      title: 'Master Metode',
      type: 'item',
      icon: 'ph ph-gear',
      url: '/methods',
      roles: ['Admin'] // Match the route
    }
  ]
};

export default masterData;
