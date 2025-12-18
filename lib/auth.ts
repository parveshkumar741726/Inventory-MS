import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = response.data.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set cookies for middleware
      const isProduction = window.location.protocol === 'https:';
      const cookieOptions = `path=/; ${isProduction ? 'secure; ' : ''}SameSite=${isProduction ? 'None' : 'Lax'}`;
      document.cookie = `accessToken=${accessToken}; ${cookieOptions}; max-age=${60 * 60 * 24}`;
      document.cookie = `refreshToken=${refreshToken}; ${cookieOptions}; max-age=${60 * 60 * 24 * 7}`;
    }
    
    return response.data.data;
  },

  async register(name: string, email: string, password: string, role: string): Promise<AuthResponse> {
    const response = await api.post('/auth/register', { name, email, password, role });
    const { user, accessToken, refreshToken } = response.data.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set cookies for middleware
      const isProduction = window.location.protocol === 'https:';
      const cookieOptions = `path=/; ${isProduction ? 'secure; ' : ''}SameSite=${isProduction ? 'None' : 'Lax'}`;
      document.cookie = `accessToken=${accessToken}; ${cookieOptions}; max-age=${60 * 60 * 24}`;
      document.cookie = `refreshToken=${refreshToken}; ${cookieOptions}; max-age=${60 * 60 * 24 * 7}`;
    }
    
    return response.data.data;
  },

  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Clear cookies
      document.cookie = 'accessToken=; path=/; max-age=0';
      document.cookie = 'refreshToken=; path=/; max-age=0';
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  },
};
