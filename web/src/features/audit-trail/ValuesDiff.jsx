import Table from 'react-bootstrap/Table';

const show = (value) => {
  if (value === undefined) return '';
  if (value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * Old vs new values side by side, one row per field (union of both objects' keys).
 * Changed fields are highlighted; create shows only "Sesudah", delete only "Sebelum".
 */
export default function ValuesDiff({ oldValues, newValues }) {
  const before = oldValues ?? {};
  const after = newValues ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (!keys.length) return <p className="text-muted mb-0">Tidak ada nilai yang dicatat.</p>;

  return (
    <Table size="sm" bordered responsive className="mb-0">
      <thead>
        <tr>
          <th style={{ width: '25%' }}>Field</th>
          <th>Sebelum</th>
          <th>Sesudah</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => {
          const changed = key in before && key in after && show(before[key]) !== show(after[key]);
          return (
            <tr key={key} className={changed ? 'table-warning' : undefined}>
              <td className="text-muted">{key}</td>
              <td className="text-break">{show(before[key])}</td>
              <td className="text-break">{show(after[key])}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
