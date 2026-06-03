import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  categoryService,
  Category,
  CategoryPayload,
  UpdateCategoryPayload,
} from '../services/api';
import { useAuthContext } from './AuthContext';

interface CategoryContextValue {
  categories: Category[];
  isLoading: boolean;
  error: string;
  createCategory: (payload: CategoryPayload) => Promise<void>;
  updateCategory: (categoryId: string, payload: UpdateCategoryPayload) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshCategories = React.useCallback(async () => {
    if (!isAuthenticated) {
      setCategories([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const nextCategories = await categoryService.list();
      setCategories(sortCategories(nextCategories));
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  const value = useMemo<CategoryContextValue>(
    () => ({
      categories,
      isLoading,
      error,
      async createCategory(payload: CategoryPayload) {
        const optimisticCategory: Category = {
          categoryId: `temp-${Date.now()}`,
          userId: 'current-user',
          name: payload.name,
          color: payload.color,
          icon: payload.icon,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setError('');
        setCategories((current) => sortCategories([...current, optimisticCategory]));

        try {
          const created = await categoryService.create(payload);
          setCategories((current) =>
            sortCategories(
              current.map((category) =>
                category.categoryId === optimisticCategory.categoryId ? created : category,
              ),
            ),
          );
        } catch (err: any) {
          setCategories((current) =>
            current.filter((category) => category.categoryId !== optimisticCategory.categoryId),
          );
          setError(err.message || 'No se pudo crear la categoría');
          throw err;
        }
      },
      async updateCategory(categoryId: string, payload: UpdateCategoryPayload) {
        const previous = categories;

        setError('');
        setCategories((current) =>
          sortCategories(
            current.map((category) =>
              category.categoryId === categoryId
                ? {
                    ...category,
                    ...payload,
                    updatedAt: new Date().toISOString(),
                  }
                : category,
            ),
          ),
        );

        try {
          const updated = await categoryService.update(categoryId, payload);
          setCategories((current) =>
            sortCategories(
              current.map((category) =>
                category.categoryId === categoryId ? updated : category,
              ),
            ),
          );
        } catch (err: any) {
          setCategories(previous);
          setError(err.message || 'No se pudo actualizar la categoría');
          throw err;
        }
      },
      async deleteCategory(categoryId: string) {
        const previous = categories;

        setError('');
        setCategories((current) =>
          current.filter((category) => category.categoryId !== categoryId),
        );

        try {
          await categoryService.remove(categoryId);
        } catch (err: any) {
          setCategories(previous);
          setError(err.message || 'No se pudo eliminar la categoría');
          throw err;
        }
      },
      refreshCategories,
    }),
    [categories, error, isLoading, refreshCategories],
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategoryContext(): CategoryContextValue {
  const context = useContext(CategoryContext);

  if (!context) {
    throw new Error('useCategoryContext must be used within a CategoryProvider');
  }

  return context;
}

