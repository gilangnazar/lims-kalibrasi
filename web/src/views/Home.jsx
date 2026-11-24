import { Link } from 'react-router-dom';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { useAuth } from 'hooks/useAuth';
import { useMenuItems } from 'hooks/useMenuItems';

// Placeholder home until role dashboards arrive (roadmap P6): greets the user and links to what they can open.
export default function Home() {
  const { user } = useAuth();
  const { items } = useMenuItems();
  const shortcuts = items.flatMap((group) => group.children);
  const roleNames = (user?.roles ?? []).map((role) => role.name).join(', ') || '-';

  return (
    <MainCard title={`Selamat datang, ${user?.full_name ?? ''}`}>
      <p className="text-muted">
        Anda masuk sebagai <strong>{roleNames}</strong>.
      </p>
      {shortcuts.length === 0 ? (
        <p className="mb-0">Belum ada menu yang tersedia untuk peran Anda. Hubungi Admin untuk mengatur hak akses.</p>
      ) : (
        <Row className="g-3">
          {shortcuts.map((item) => (
            <Col key={item.id} sm={6} lg={3}>
              <Link to={item.url} className="d-flex align-items-center gap-2 p-3 border rounded text-reset">
                <i className={`${item.icon} f-20`} />
                {item.title}
              </Link>
            </Col>
          ))}
        </Row>
      )}
    </MainCard>
  );
}
