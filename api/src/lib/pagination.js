const { z } = require('zod');

// Shared query schema for list endpoints: ?page=1&limit=20&search=abc&sort=-created_at
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sort: z.string().trim().max(50).optional()
});

// sort "name" = ascending, "-name" = descending. Only columns in `allowed` are accepted.
function applySort(qb, sort, allowed, fallback = 'id') {
  if (!sort) return qb.orderBy(fallback, 'desc');
  const desc = sort.startsWith('-');
  const column = desc ? sort.slice(1) : sort;
  if (!allowed.includes(column)) return qb.orderBy(fallback, 'desc');
  return qb.orderBy(column, desc ? 'desc' : 'asc');
}

function applySearch(qb, search, columns) {
  if (!search) return qb;
  return qb.where((inner) => {
    for (const column of columns) inner.orWhere(column, 'like', `%${search}%`);
  });
}

async function paginate(qb, { page, limit }) {
  const [{ total }] = await qb.clone().clearSelect().clearOrder().count({ total: '*' });
  const data = await qb.offset((page - 1) * limit).limit(limit);
  const count = Number(total);
  return { data, meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
}

module.exports = { listQuery, applySort, applySearch, paginate };
