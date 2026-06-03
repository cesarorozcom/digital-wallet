import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthContext } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CategoriesPage from './pages/CategoriesPage';

const APP_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  profile: '/profile',
  categories: '/categories',
} as const;

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuthContext();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Cargando sesión...</p>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to={APP_ROUTES.dashboard} replace /> : <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={APP_ROUTES.login}
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path={APP_ROUTES.register}
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path={APP_ROUTES.dashboard}
          element={
            <ProtectedRoute redirectTo={APP_ROUTES.login}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>
        <Route
          path={APP_ROUTES.profile}
          element={
            <ProtectedRoute redirectTo={APP_ROUTES.login}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProfilePage />} />
        </Route>
        <Route
          path={APP_ROUTES.categories}
          element={
            <ProtectedRoute redirectTo={APP_ROUTES.login}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CategoriesPage />} />
        </Route>
        <Route path={APP_ROUTES.home} element={<Navigate to={APP_ROUTES.dashboard} replace />} />
        <Route path="*" element={<Navigate to={APP_ROUTES.home} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
