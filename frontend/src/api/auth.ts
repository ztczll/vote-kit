import api from './client';
import type { User } from '@/types';

export const authApi = {
  register(username: string, email: string, password: string) {
    return api.post<{ user: User }>('/auth/register', { username, email, password });
  },

  login(username: string, password: string) {
    return api.post<{ token: string; user: User }>('/auth/login', { username, password });
  },

  resendVerification(email: string) {
    return api.post<{ success: boolean }>('/auth/resend-verification', { email });
  },
};
