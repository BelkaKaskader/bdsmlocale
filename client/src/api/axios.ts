import axios from 'axios';

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Добавляем перехватчик для запросов
api.interceptors.request.use(
  (config) => {
    // Не добавляем токен для запроса авторизации
    if (config.url === '/auth/login') {
      return config;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      // Если токена нет, перенаправляем на страницу входа
      window.location.href = '/login';
      return Promise.reject('Токен не предоставлен');
    }
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Добавляем перехватчик для ответов
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Если получаем ошибку авторизации, перенаправляем на страницу входа
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 