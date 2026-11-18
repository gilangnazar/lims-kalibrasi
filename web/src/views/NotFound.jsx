import { Link } from 'react-router-dom';

import MainCard from 'components/MainCard';

export default function NotFound() {
  return (
    <MainCard className="text-center py-4">
      <h2 className="mb-2">404</h2>
      <p className="text-muted">Halaman tidak ditemukan.</p>
      <Link to="/" className="btn btn-primary">
        Kembali ke beranda
      </Link>
    </MainCard>
  );
}
