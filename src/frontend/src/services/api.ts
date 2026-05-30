import axios from 'axios';

declare const process: {
  env: {
    REACT_APP_API_BASE_URL?: string;
    REACT_APP_API_PATH?: string;
  };
};

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
const API_PATH = process.env.REACT_APP_API_PATH || '/api';
const API_URL = `${API_BASE}${API_PATH}`;

console.log('🌐 API Configuration:', { API_BASE, API_PATH, API_URL });

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`📥 Response: ${response.status} ${response.statusText}`);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshTokenId');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

export const authService = {
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> => {
    try {
      console.log('📝 Registering user:', data.email);
      const response = await api.post<AuthResponse>('/auth/register', data);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      console.error('❌ Registration error:', message);
      throw new Error(message);
    }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      console.log('🔑 Logging in:', email);
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      console.error('❌ Login error:', message);
      throw new Error(message);
    }
  },

  logout: async (): Promise<void> => {
    try {
      console.log('👋 Logging out');
      await api.post('/auth/logout');
    } catch (error: any) {
      console.error('❌ Logout error:', error.response?.data?.error);
    }
  },

  refreshToken: async (refreshTokenId: string): Promise<AuthResponse> => {
    try {
      console.log('🔄 Refreshing token');
      const response = await api.post<AuthResponse>('/auth/refresh-token', {
        refreshTokenId,
      });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Token refresh failed';
      console.error('❌ Refresh error:', message);
      throw new Error(message);
    }
  },
};

export default api;