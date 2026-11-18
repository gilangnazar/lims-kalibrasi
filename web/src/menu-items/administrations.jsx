const administration = {
  id: 'administration',
  title: 'Administration',
  type: 'group',
  children: [
    {
      id: 'users',
      title: 'Users',
      type: 'item',
      icon: '',
      url: '/users',
      roles: ['Admin']
    }
  ]
};

export default administration;
