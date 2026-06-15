/** 
 *  bank-summary is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    bank-summary is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with bank-summary.  If not, see <https://gnu.org>.
*/
import { v4 as uuidv4 } from 'uuid';
import DynamoDBService from './DynamoDBService';
import { Category, CategoryPayload } from '../models/Category';

class CategoryService {
  private tableName = process.env.CATEGORIES_TABLE || 'categories';

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private validatePayload(payload: CategoryPayload): void {
    if (!payload.name.trim()) {
      throw new Error('Category name is required');
    }

    if (!payload.color.trim()) {
      throw new Error('Category color is required');
    }

    if (!payload.icon.trim()) {
      throw new Error('Category icon is required');
    }
  }

  async listCategories(userId: string): Promise<Category[]> {
    const items = await DynamoDBService.scan(this.tableName);

    return items
      .filter((item) => item.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name)) as Category[];
  }

  async getCategoryById(categoryId: string): Promise<Category | null> {
    const item = await DynamoDBService.get(this.tableName, { categoryId });
    return (item as Category) || null;
  }

  async createCategory(userId: string, payload: CategoryPayload): Promise<Category> {
    this.validatePayload(payload);
    await this.ensureCategoryNameIsUnique(userId, payload.name);

    const now = new Date().toISOString();
    const category: Category = {
      categoryId: uuidv4(),
      userId,
      name: payload.name.trim(),
      color: payload.color.trim(),
      icon: payload.icon.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await DynamoDBService.put(this.tableName, category);
    return category;
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    payload: Partial<CategoryPayload>,
  ): Promise<Category | null> {
    const category = await this.getCategoryById(categoryId);

    if (!category || category.userId !== userId) {
      return null;
    }

    const nextName = payload.name?.trim();
    const nextColor = payload.color?.trim();
    const nextIcon = payload.icon?.trim();

    if (nextName !== undefined && !nextName) {
      throw new Error('Category name is required');
    }

    if (nextColor !== undefined && !nextColor) {
      throw new Error('Category color is required');
    }

    if (nextIcon !== undefined && !nextIcon) {
      throw new Error('Category icon is required');
    }

    if (nextName && this.normalizeName(nextName) !== this.normalizeName(category.name)) {
      await this.ensureCategoryNameIsUnique(userId, nextName, categoryId);
    }

    const updates: Partial<Category> = {
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(nextColor !== undefined ? { color: nextColor } : {}),
      ...(nextIcon !== undefined ? { icon: nextIcon } : {}),
      updatedAt: new Date().toISOString(),
    };

    const updated = await DynamoDBService.update(this.tableName, { categoryId }, updates);
    return (updated as Category) || null;
  }

  async deleteCategory(userId: string, categoryId: string): Promise<boolean> {
    const category = await this.getCategoryById(categoryId);

    if (!category || category.userId !== userId) {
      return false;
    }

    await DynamoDBService.delete(this.tableName, { categoryId });
    return true;
  }

  async ensureCategoryNameIsUnique(
    userId: string,
    name: string,
    currentCategoryId?: string,
  ): Promise<void> {
    const categories = await this.listCategories(userId);
    const normalizedName = this.normalizeName(name);

    const duplicate = categories.find(
      (category) =>
        this.normalizeName(category.name) === normalizedName &&
        category.categoryId !== currentCategoryId,
    );

    if (duplicate) {
      throw new Error('Category with this name already exists');
    }
  }
}

export default new CategoryService();

