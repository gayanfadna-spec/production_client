import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fadna_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only clear and redirect if not already on login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('fadna_token');
        localStorage.removeItem('fadna_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
