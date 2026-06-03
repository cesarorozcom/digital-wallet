import React, { useMemo, useState } from 'react';
import CategoryForm from '../components/CategoryForm';
import { useCategoryContext } from '../context/CategoryContext';
import { Category } from '../services/api';

export default function CategoriesPage() {
  const { categories, createCategory, deleteCategory, error, isLoading, updateCategory } =
    useCategoryContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const hasCategories = categories.length > 0;
  const headerStats = useMemo(
    () => [
      { label: 'Categorías', value: String(categories.length) },
      {
        label: 'Color más usado',
        value: hasCategories ? categories[0].color.toUpperCase() : 'N/A',
      },
    ],
    [categories, hasCategories],
  );

  const handleCreate = async (payload: { name: string; color: string; icon: string }) => {
    await createCategory(payload);
    setIsModalOpen(false);
  };

  const handleUpdate = async (payload: { name?: string; color?: string; icon?: string }) => {
    if (!selectedCategory) {
      return;
    }

    await updateCategory(selectedCategory.categoryId, payload);
    setSelectedCategory(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (categoryId: string) => {
    await deleteCategory(categoryId);
  };

  const openCreateModal = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  return (
    <section>
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Organización
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Gestiona tus categorías</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Crea categorías personalizadas para clasificar ingresos y gastos con color e ícono.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Nueva categoría
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {headerStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Lista de categorías</h3>
        </div>

        {isLoading && !hasCategories ? (
          <div className="px-6 py-8 text-sm text-slate-500">Cargando categorías...</div>
        ) : null}

        {!isLoading && !hasCategories ? (
          <div className="px-6 py-10 text-center">
            <p className="text-lg font-medium text-slate-900">Aún no tienes categorías</p>
            <p className="mt-2 text-sm text-slate-500">
              Crea la primera para empezar a organizar tus movimientos.
            </p>
          </div>
        ) : null}

        {hasCategories ? (
          <div className="divide-y divide-slate-200">
            {categories.map((category) => (
              <div
                key={category.categoryId}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white shadow-sm"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{category.name}</p>
                    <p className="text-sm text-slate-500">
                      Actualizada {new Date(category.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(category)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(category.categoryId)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {isModalOpen ? (
        <CategoryForm
          initialCategory={selectedCategory}
          isLoading={isLoading}
          onCancel={() => {
            setSelectedCategory(null);
            setIsModalOpen(false);
          }}
          onSubmit={selectedCategory ? handleUpdate : handleCreate}
        />
      ) : null}
    </section>
  );
}

