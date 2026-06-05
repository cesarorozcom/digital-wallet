export interface Category {
  categoryId: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryPayload {
  name: string;
  color: string;
  icon: string;
}

