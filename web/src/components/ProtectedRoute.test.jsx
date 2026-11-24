import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from 'components/ProtectedRoute';
import { AuthContext } from 'context/AuthContext';

function renderAt(auth, props = {}) {
  return render(
    <AuthContext.Provider value={{ loading: false, ...auth }}>
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/" element={<div>home page</div>} />
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/users"
            element={
              <ProtectedRoute {...props}>
                <div>users page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to login when not authenticated', () => {
    renderAt({ isAuthenticated: false, user: null }, { menu: 'users' });
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects home without view permission on the menu', () => {
    renderAt({ isAuthenticated: true, user: { permissions: ['customers:view'] } }, { menu: 'users' });
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders the page with view permission', () => {
    renderAt({ isAuthenticated: true, user: { permissions: ['users:view'] } }, { menu: 'users' });
    expect(screen.getByText('users page')).toBeInTheDocument();
  });

  it('checks a specific action when given', () => {
    renderAt({ isAuthenticated: true, user: { permissions: ['users:view'] } }, { menu: 'users', action: 'edit' });
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('only needs a login when no menu is given', () => {
    renderAt({ isAuthenticated: true, user: { permissions: [] } });
    expect(screen.getByText('users page')).toBeInTheDocument();
  });
});
