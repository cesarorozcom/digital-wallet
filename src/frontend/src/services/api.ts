import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  clearSession,
  getAccessToken,
  getRefreshTokenId,
  persistSession,
} from '../utils/tokenStorage';

declare const process: {
  env: {
    NODE_ENV?: 'development' | 'production' | 'test';
    REACT_APP_API_BASE_URL?: string;
    REACT_APP_API_PATH?: string;
  };
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
const API_PATH = process.env.REACT_APP_API_PATH || '/api';
const API_URL = `${API_BASE_URL}${API_PATH}`;

function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as { error?: string } | undefined)?.error;

    if (responseMessage) {
      return responseMessage;
    }

    if (error.message) {
      return error.message;
    }
  }

  return fallback;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshTokenId: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateProfilePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
}

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

export interface UpdateCategoryPayload {
  name?: string;
  color?: string;
  icon?: string;
}

export interface ExtractedData {
  confidence: number;
  rawText: string;
  reviewNotes?: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  categoryId: string;
  amount: number;
  type: 'DEPOSIT' | 'PAYMENT';
  merchantName: string;
  receiptImageUrl: string;
  status: 'PENDING' | 'PENDING_REVIEW' | 'CONFIRMED';
  transactionDate: string;
  transactionMonth: string;
  notes?: string;
  extractedData?: ExtractedData;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionPayload {
  transactionId?: string;
  categoryId: string;
  amount: number;
  merchantName: string;
  receiptImageUrl?: string;
  transactionDate: string;
  notes?: string;
}

export interface UpdateTransactionPayload {
  categoryId?: string;
  amount?: number;
  merchantName?: string;
  transactionDate?: string;
  notes?: string;
  status?: 'PENDING' | 'PENDING_REVIEW' | 'CONFIRMED';
  extractedData?: Partial<ExtractedData>;
}

interface RetryableRequestConfig {
  _retry?: boolean;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & RetryableRequestConfig) | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh-token'
    ) {
      const refreshTokenId = getRefreshTokenId();

      if (!refreshTokenId) {
        clearSession();
        redirectToLogin();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post<AuthResponse>(
          `${API_URL}/auth/refresh-token`,
          { refreshTokenId },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        persistSession(refreshResponse.data);

        originalRequest.headers.set(
          'Authorization',
          `Bearer ${refreshResponse.data.accessToken}`,
        );

        return apiClient(originalRequest);
      } catch (refreshError) {
        clearSession();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const authService = {
  async register(data: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Registration failed'));
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  },

  async logout(): Promise<void> {
    const refreshTokenId = getRefreshTokenId();

    try {
      await apiClient.post('/auth/logout', { refreshTokenId });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Logout failed'));
    } finally {
      clearSession();
    }
  },

  async refreshToken(refreshTokenId: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/refresh-token', {
        refreshTokenId,
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Token refresh failed'));
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      return response.data.user;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch current user'));
    }
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    try {
      const response = await apiClient.put<{ user: User }>('/auth/profile', payload);
      return response.data.user;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update profile'));
    }
  },
};

export const categoryService = {
  async list(): Promise<Category[]> {
    try {
      const response = await apiClient.get<{ categories: Category[] }>('/categories');
      return response.data.categories;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch categories'));
    }
  },

  async create(payload: CategoryPayload): Promise<Category> {
    try {
      const response = await apiClient.post<{ category: Category }>('/categories', payload);
      return response.data.category;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to create category'));
    }
  },

  async update(categoryId: string, payload: UpdateCategoryPayload): Promise<Category> {
    try {
      const response = await apiClient.put<{ category: Category }>(
        `/categories/${categoryId}`,
        payload,
      );
      return response.data.category;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update category'));
    }
  },

  async remove(categoryId: string): Promise<void> {
    try {
      await apiClient.delete(`/categories/${categoryId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to delete category'));
    }
  },
};

export const transactionService = {
  async list(month?: string, categoryId?: string): Promise<Transaction[]> {
    try {
      const params = new URLSearchParams();
      if (month) {
        params.append('month', month);
      }
      if (categoryId) {
        params.append('categoryId', categoryId);
      }
      const response = await apiClient.get<{ transactions: Transaction[] }>(
        `/transactions${params.toString() ? `?${params.toString()}` : ''}`,
      );
      return response.data.transactions;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch transactions'));
    }
  },

  async get(transactionId: string): Promise<Transaction> {
    try {
      const response = await apiClient.get<{ transaction: Transaction }>(
        `/transactions/${transactionId}`,
      );
      return response.data.transaction;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch transaction'));
    }
  },

  async create(payload: TransactionPayload): Promise<Transaction> {
    try {
      const response = await apiClient.post<{ transaction: Transaction }>(
        '/transactions',
        payload,
      );
      return response.data.transaction;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to create transaction'));
    }
  },

  async update(
    transactionId: string,
    payload: UpdateTransactionPayload,
  ): Promise<Transaction> {
    try {
      const response = await apiClient.put<{ transaction: Transaction }>(
        `/transactions/${transactionId}`,
        payload,
      );
      return response.data.transaction;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update transaction'));
    }
  },

  async remove(transactionId: string): Promise<void> {
    try {
      await apiClient.delete(`/transactions/${transactionId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to delete transaction'));
    }
  },
};

export const uploadService = {
  async getPresignUrl(
    filename: string,
    contentType: string,
    transactionId: string,
  ): Promise<{ url: string; key: string }> {
    try {
      const response = await apiClient.post<{ url: string; key: string }>(
        '/uploads/presign',
        { filename, contentType, transactionId },
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to get presigned URL'));
    }
  },

  async uploadToS3(
    presignedUrl: string,
    blob: Blob,
    contentType: string,
  ): Promise<void> {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': contentType },
      // Deliberately no Authorization header — S3 presigned URLs are self-authorized
    });
    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
    }
  },

  async getViewUrl(key: string): Promise<string> {
    try {
      const response = await apiClient.get<{ url: string }>('/uploads/view', {
        params: { key },
      });
      return response.data.url;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to get view URL'));
    }
  },
};

export { API_BASE_URL, API_PATH, API_URL, clearSession, getAccessToken, getRefreshTokenId };

export default apiClient;
