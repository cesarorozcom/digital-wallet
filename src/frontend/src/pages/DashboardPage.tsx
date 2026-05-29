import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshTokenId');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Billetera Digital</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">
              {user.firstName} {user.lastName}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Total de ingresos</h2>
            <p className="text-3xl font-bold text-green-600">$0.00</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Total de gastos</h2>
            <p className="text-3xl font-bold text-red-600">$0.00</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Balance</h2>
            <p className="text-3xl font-bold text-blue-600">$0.00</p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Funciones en desarrollo</h2>
          <p className="text-gray-600">
            • Crear transacciones<br />
            • Capturar recibos<br />
            • Administrar categorías<br />
            • Ver reportes mensuales
          </p>
        </div>
      </main>
    </div>
  );
}
