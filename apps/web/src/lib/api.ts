import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const api: AxiosInstance = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config.__isRetry) {
      const refresh = useAuthStore.getState().refreshToken;
      if (refresh) {
        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: refresh });
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
          err.config.__isRetry = true;
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(err.config);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(err);
  },
);