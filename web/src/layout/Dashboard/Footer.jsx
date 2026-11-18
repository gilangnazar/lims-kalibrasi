import branding from 'branding.json';

// ==============================|| MAIN LAYOUT - FOOTER ||============================== //
export default function Footer() {
  return (
    <footer className="pc-footer">
      <div className="footer-wrapper container-fluid">
        <p className="m-0 my-1">
          © {new Date().getFullYear()}{' '}
          <a href={branding.company.url} target="_blank" rel="noopener noreferrer" className="text-primary">
            {branding.company.name}
          </a>
        </p>
      </div>
    </footer>
  );
}
