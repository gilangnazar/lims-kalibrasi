import useSWR from 'swr';

const API_URL = 'http://localhost:5000/api/standard-instruments';

const getToken = () => localStorage.getItem('token');

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

export const useStandardInstruments = () => {
  const { data, error, isLoading, mutate } = useSWR(API_URL, fetcher);

  return {
    instruments: data || [],
    loading: isLoading,
    error: error?.message,
    mutate
  };
};

export const useCreateStandardInstrument = () => {
  const { mutate } = useStandardInstruments();

  const create = async (instrumentData) => {
    const token = getToken();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(instrumentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create');
    }

    mutate();
    return data.data;
  };

  return { create };
};

export const useUpdateStandardInstrument = () => {
  const { mutate } = useStandardInstruments();

  const update = async (id, instrumentData) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(instrumentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update');
    }

    mutate();
    return data;
  };

  return { update };
};

export const useDeleteStandardInstrument = () => {
  const { mutate } = useStandardInstruments();

  const deleteInstrument = async (id) => {
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
      throw new Error(data.message || 'Failed to delete');
    }

    mutate();
    return data;
  };

  return { deleteInstrument };
};
