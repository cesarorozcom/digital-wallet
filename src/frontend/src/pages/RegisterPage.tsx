import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthField from '../components/auth/AuthField';
import AuthMessage from '../components/auth/AuthMessage';
import { validateRegisterForm } from '../components/auth/validation';
import { useAuthContext } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthLoading, register } = useAuthContext();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateRegisterForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await register({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      });
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.message || 'Registration failed. Please try again.';
      console.error('❌ Registration error:', message);
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
          <p className="text-gray-600 mb-8">Comienza a gestionar tus finanzas</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <AuthMessage message={error} /> : null}

            <div className="grid grid-cols-2 gap-4">
              <AuthField
                id="firstName"
                label="Nombre"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isAuthLoading}
                placeholder="Juan"
              />
              <AuthField
                id="lastName"
                label="Apellido"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isAuthLoading}
                placeholder="Pérez"
              />
            </div>

            <AuthField
              id="email"
              type="email"
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isAuthLoading}
              placeholder="tu@email.com"
            />

            <AuthField
              id="password"
              type="password"
              label="Contraseña"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isAuthLoading}
              placeholder="Min. 8 caracteres"
              hint="Mínimo 8 caracteres, una mayúscula, un número y un carácter especial"
            />

            <AuthField
              id="confirmPassword"
              type="password"
              label="Confirmar contraseña"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isAuthLoading}
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAuthLoading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
