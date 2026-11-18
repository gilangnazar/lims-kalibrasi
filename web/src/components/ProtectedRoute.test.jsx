import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from 'components/ProtectedRoute';
import { AuthContext } from 'context/AuthContext';

function renderAt(auth, requiredRoles) {
  return render(
    <AuthContext.Provider value={{ loading: false, ...auth }}>
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/" element={<div>home page</div>} />
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRoles={requiredRoles}>
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
    renderAt({ isAuthenticated: false, user: null });
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects home when the user lacks the required role', () => {
    renderAt({ isAuthenticated: true, user: { role: 'Teknisi' } }, ['Admin']);
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders the page for a user with the required role', () => {
    renderAt({ isAuthenticated: true, user: { role: 'Admin' } }, ['Admin']);
    expect(screen.getByText('users page')).toBeInTheDocument();
  });
});
