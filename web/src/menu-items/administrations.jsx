const administration = {
  id: 'administration',
  title: 'Administrasi',
  type: 'group',
  children: [
    {
      id: 'users',
      title: 'Pengguna',
      type: 'item',
      icon: 'ph ph-user-gear',
      url: '/users',
      permission: 'users.read'
    }
  ]
};

export default administration;
