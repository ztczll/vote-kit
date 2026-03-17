import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('votekit_token'));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isEmailVerified = computed(() => user.value?.email_verified !== false);

  // 初始化：从 localStorage 恢复用户信息
  function init() {
    const storedUser = localStorage.getItem('votekit_user');
    if (storedUser && token.value) {
      try {
        user.value = JSON.parse(storedUser);
      } catch (e) {
        // 解析失败，清除无效数据
        localStorage.removeItem('votekit_user');
        localStorage.removeItem('votekit_token');
        token.value = null;
      }
    }
  }

  async function login(username: string, password: string) {
    const { data } = await authApi.login(username, password);
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('votekit_token', data.token);
    localStorage.setItem('votekit_user', JSON.stringify(data.user));
  }

  async function register(username: string, email: string, password: string) {
    await authApi.register(username, email, password);
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('votekit_token');
    localStorage.removeItem('votekit_user');
  }

  // 自动初始化
  init();

  return { user, token, isAuthenticated, isAdmin, isEmailVerified, login, register, logout };
});
