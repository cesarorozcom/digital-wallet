import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Transacciones', path: '/transactions' },
  { label: 'Categorías', path: '/categories' },
  { label: 'Perfil', path: '/profile' },
] as const;

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthLoading, logout, user } = useAuthContext();
  const [logoutError, setLogoutError] = React.useState('');

  const handleLogout = async () => {
    setLogoutError('');

    try {
      await logout();
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      setLogoutError(error.message || 'No se pudo cerrar la sesión');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Family Ledger
              </p>
              <h1 className="text-xl font-bold text-slate-900">Billetera Digital</h1>
            </div>

            <nav className="flex items-center gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {user ? `${user.firstName} ${user.lastName}` : 'Sesión activa'}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isAuthLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAuthLoading ? 'Cerrando...' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </header>

      {logoutError ? (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {logoutError}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
