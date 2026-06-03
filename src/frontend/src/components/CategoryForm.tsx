import React, { useEffect, useState } from 'react';
import { Category, CategoryPayload } from '../services/api';

const CATEGORY_COLORS = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
] as const;

const CATEGORY_ICONS = ['💰', '🍔', '🏠', '🚗', '🎉', '🧾', '🛍️', '💡'] as const;

interface CategoryFormProps {
  initialCategory?: Category | null;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (payload: CategoryPayload) => Promise<void>;
}

export default function CategoryForm({
  initialCategory,
  isLoading,
  onCancel,
  onSubmit,
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialCategory) {
      setName(initialCategory.name);
      setColor(initialCategory.color);
      setIcon(initialCategory.icon);
      return;
    }

    setName('');
    setColor(CATEGORY_COLORS[0]);
    setIcon(CATEGORY_ICONS[0]);
  }, [initialCategory]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        color,
        icon,
      });
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la categoría');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Categorías
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              {initialCategory ? 'Editar categoría' : 'Nueva categoría'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="categoryName" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre
            </label>
            <input
              id="categoryName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Ej. Servicios"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Color</p>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  className={`h-10 w-10 rounded-full border-4 transition ${
                    color === option ? 'border-slate-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: option }}
                  aria-label={`Seleccionar color ${option}`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Ícono</p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {CATEGORY_ICONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIcon(option)}
                  className={`rounded-xl border px-3 py-3 text-2xl transition ${
                    icon === option
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Vista previa</p>
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-white"
                style={{ backgroundColor: color }}
              >
                {icon}
              </span>
              <span className="font-medium text-slate-900">{name || 'Nueva categoría'}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : initialCategory ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
