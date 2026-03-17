import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 为AI生成创建专用的长超时客户端
export const aiApi = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5分钟超时，适应AI生成的长时间响应
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('votekit_token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('votekit_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('votekit_token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('votekit_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
