import useSWR from 'swr';

const API_URL = 'http://localhost:5000/api/users';

// Get auth token from localStorage
const getToken = () => localStorage.getItem('token');

// Fetcher function with auth header
const fetcher = async (url) => {
  const token = getToken();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error fetching data');
  }

  const data = await response.json();
  return data.data;
};

// Hook to get all users
export const useUsers = () => {
  const { data, error, isLoading, mutate } = useSWR(API_URL, fetcher);

  return {
    users: data || [],
    loading: isLoading,
    error: error?.message,
    mutate
  };
};

// Hook to create user
export const useCreateUser = () => {
  const { mutate } = useUsers();

  const createUser = async (userData) => {
    const token = getToken();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create user');
    }

    // Refresh user list
    mutate();
    return data.data;
  };

  return { createUser };
};

// Hook to update user
export const useUpdateUser = () => {
  const { mutate } = useUsers();

  const updateUser = async (id, userData) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user');
    }

    // Refresh user list
    mutate();
    return data;
  };

  return { updateUser };
};

// Hook to delete user
export const useDeleteUser = () => {
  const { mutate } = useUsers();

  const deleteUser = async (id) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete user');
    }

    // Refresh user list
    mutate();
    return data;
  };

  return { deleteUser };
};
