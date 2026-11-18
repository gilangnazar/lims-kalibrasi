import Alert from 'react-bootstrap/Alert';
import Pagination from 'react-bootstrap/Pagination';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

/**
 * columns: [{ key, header, render?(row) }]. `actions(row)` adds a last column.
 * meta comes from the API ({ page, limit, total, totalPages }).
 */
export default function DataTable({ columns, rows, meta, isLoading, error, emptyText = 'Belum ada data', actions, onPageChange }) {
  const columnCount = columns.length + 1 + (actions ? 1 : 0);
  const offset = (meta.page - 1) * meta.limit;

  return (
    <>
      {error && (
        <Alert variant="danger" className="m-3">
          {error.message}
        </Alert>
      )}
      <Table responsive hover className="mb-0">
        <thead>
          <tr>
            <th style={{ width: 56 }}>#</th>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
            {actions && <th className="text-end">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-4">
                <Spinner animation="border" size="sm" />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="text-center py-4 text-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.id}>
                <td>{offset + index + 1}</td>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : (row[column.key] ?? '-')}</td>
                ))}
                {actions && <td className="text-end text-nowrap">{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </Table>
      {meta.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center p-3">
          <small className="text-muted">
            {offset + 1}–{Math.min(offset + meta.limit, meta.total)} dari {meta.total}
          </small>
          <Pagination className="mb-0">
            <Pagination.Prev disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} />
            <Pagination.Item active>{meta.page}</Pagination.Item>
            <Pagination.Next disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} />
          </Pagination>
        </div>
      )}
    </>
  );
}
