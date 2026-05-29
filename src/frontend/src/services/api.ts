import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface AuthResponse {
  accessToken: string;
  refreshTokenId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token expiration
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshTokenId');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async refreshToken(refreshTokenId: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/refresh-token', {
      refreshTokenId,
    });
    return response.data;
  }
}

export default new ApiService();
