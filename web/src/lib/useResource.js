import useSWR, { useSWRConfig } from 'swr';
import { api } from 'lib/api';

// SWR keys are [resource, params], so every list of a resource can be revalidated together.
const fetchList = ([resource, params]) => api.get(`/${resource}`, params);

/** Paginated list: useList('customers', { page, limit, search }). Pass enabled=false to skip fetching. */
export function useList(resource, params = {}, { enabled = true } = {}) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? [resource, params] : null, fetchList, { keepPreviousData: true });
  return {
    rows: data?.data ?? [],
    meta: data?.meta ?? { page: 1, limit: params.limit ?? 20, total: 0, totalPages: 0 },
    error,
    isLoading,
    mutate
  };
}

/** create / update / remove for a resource; refreshes all of its lists afterwards. */
export function useResourceMutations(resource) {
  const { mutate } = useSWRConfig();
  const revalidate = () => mutate((key) => Array.isArray(key) && key[0] === resource);

  return {
    create: async (body) => {
      const res = await api.post(`/${resource}`, body);
      await revalidate();
      return res.data;
    },
    update: async (id, body) => {
      const res = await api.put(`/${resource}/${id}`, body);
      await revalidate();
      return res.data;
    },
    remove: async (id) => {
      await api.delete(`/${resource}/${id}`);
      await revalidate();
    }
  };
}
