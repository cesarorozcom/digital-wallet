import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthMessage from '../components/auth/AuthMessage';
import { validateLoginForm } from '../components/auth/validation';
import { useAuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthLoading, login } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateLoginForm(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.message || 'Login failed. Please try again.';
      console.error('❌ Login error:', message);
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billetera Digital</h1>
          <p className="text-gray-600 mb-8">Gestiona tus finanzas familiares</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <AuthMessage message={error} /> : null}

            <AuthField
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isAuthLoading}
              placeholder="tu@email.com"
            />

            <AuthField
              id="password"
              type="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isAuthLoading}
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAuthLoading ? 'Cargando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
