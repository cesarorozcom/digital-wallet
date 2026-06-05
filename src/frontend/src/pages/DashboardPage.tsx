import React from 'react';
import { useAuthContext } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuthContext();

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <section className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-8 text-white shadow-lg">
        <p className="text-sm font-medium text-blue-100">Resumen general</p>
        <h2 className="mt-2 text-3xl font-bold">
          Hola, {user.firstName}. Tu tablero financiero está listo.
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-blue-50">
          Visualiza ingresos, gastos y el balance general de tu hogar desde un solo lugar.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Total de ingresos</h2>
          <p className="text-3xl font-bold text-green-600">$0.00</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Total de gastos</h2>
          <p className="text-3xl font-bold text-red-600">$0.00</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Balance</h2>
          <p className="text-3xl font-bold text-blue-600">$0.00</p>
        </div>
      </div>

      <section className="mt-8 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Próximas funciones</h2>
        <ul className="space-y-2 text-gray-600">
          <li>✓ Crear transacciones</li>
          <li>✓ Capturar recibos</li>
          <li>✓ Administrar categorías</li>
          <li>✓ Ver reportes mensuales</li>
        </ul>
      </section>
    </div>
  );
}
