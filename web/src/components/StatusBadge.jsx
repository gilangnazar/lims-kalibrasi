import Badge from 'react-bootstrap/Badge';

export default function StatusBadge({ active, activeText = 'Aktif', inactiveText = 'Tidak aktif' }) {
  return <Badge bg={active ? 'success' : 'secondary'}>{active ? activeText : inactiveText}</Badge>;
}
