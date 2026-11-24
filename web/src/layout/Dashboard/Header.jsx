import { useState } from 'react';
import { Link } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Nav from 'react-bootstrap/Nav';
import Stack from 'react-bootstrap/Stack';

// project-imports
import ChangePasswordModal from 'features/auth/ChangePasswordModal';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { useAuth } from 'hooks/useAuth';

// =============================|| MAIN LAYOUT - HEADER ||============================== //

export default function Header() {
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <header className="pc-header">
      <div className="header-wrapper">
        <div className="me-auto pc-mob-drp">
          <Nav className="list-unstyled">
            <Nav.Item className="pc-h-item pc-sidebar-collapse">
              <Nav.Link as={Link} to="#" className="pc-head-link ms-0" id="sidebar-hide" onClick={() => handlerDrawerOpen(!drawerOpen)}>
                <i className="ph ph-list" />
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="pc-h-item pc-sidebar-popup">
              <Nav.Link as={Link} to="#" className="pc-head-link ms-0" id="mobile-collapse" onClick={() => handlerDrawerOpen(!drawerOpen)}>
                <i className="ph ph-list" />
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
        <div className="ms-auto">
          <Nav className="list-unstyled">
            <Dropdown className="pc-h-item" align="end">
              <Dropdown.Toggle
                className="pc-head-link arrow-none me-0"
                variant="link"
                id="user-profile-dropdown"
                aria-label="Menu pengguna"
              >
                <i className="ph ph-user-circle" />
              </Dropdown.Toggle>

              <Dropdown.Menu className="dropdown-user-profile pc-h-dropdown p-0 overflow-hidden">
                <Dropdown.Header className="bg-primary">
                  <Stack gap={1} className="my-2">
                    <h6 className="text-white mb-0">{user?.full_name}</h6>
                    <span className="text-white text-opacity-75">
                      {user?.username} · {(user?.roles ?? []).map((role) => role.name).join(', ')}
                    </span>
                  </Stack>
                </Dropdown.Header>

                <div className="dropdown-body">
                  <Dropdown.Item as="button" className="justify-content-start" onClick={() => setShowChangePassword(true)}>
                    <i className="ph ph-lock-key me-2" />
                    Ubah Password
                  </Dropdown.Item>
                  <div className="d-grid my-2">
                    <Button onClick={logout}>
                      <i className="ph ph-sign-out align-middle me-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </div>
      </div>
      <ChangePasswordModal show={showChangePassword} onHide={() => setShowChangePassword(false)} />
    </header>
  );
}
