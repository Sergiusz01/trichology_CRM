import axios from 'axios';

// Use relative path for production (Nginx proxy handles /api)
// Use full URL only for local development
const API_URL = (import.meta as any).env?.VITE_API_URL || '';

export const BASE_URL = API_URL;

export const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
const getToken = () => localStorage.getItem('accessToken');
const token = getToken();
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Update token when it changes
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Global error handler function - will be set by setupApiErrorHandler
let globalErrorHandler: ((message: string, variant: 'error' | 'warning' | 'info') => void) | null = null;

export const setupApiErrorHandler = (errorHandler: (message: string, variant: 'error' | 'warning' | 'info') => void) => {
  globalErrorHandler = errorHandler;
};

// Helper function to format error messages
const formatErrorMessage = (error: any): string => {
  if (!error.response) {
    return 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.';
  }

  const { status, data } = error.response;

  // Handle validation errors
  if (status === 400 && data?.details && Array.isArray(data.details)) {
    const firstError = data.details[0];
    if (firstError?.field && firstError?.message) {
      return `${firstError.field}: ${firstError.message}`;
    }
    return data.message || 'Błąd walidacji danych';
  }

  // Handle specific error messages
  if (data?.message) {
    return data.message;
  }

  if (data?.error) {
    return data.error;
  }

  // Handle status codes
  switch (status) {
    case 400:
      return 'Nieprawidłowe żądanie';
    case 401:
      return 'Brak autoryzacji';
    case 403:
      return 'Brak uprawnień';
    case 404:
      return 'Nie znaleziono';
    case 409:
      return 'Konflikt danych';
    case 500:
      return 'Wewnętrzny błąd serwera';
    default:
      return `Błąd ${status}`;
  }
};

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshUrl = API_URL ? `${API_URL}/api/auth/refresh` : '/api/auth/refresh';
          const response = await axios.post(refreshUrl, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        // Clear tokens on refresh failure
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        
        // Dispatch custom event for AuthContext to handle navigation
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_refresh_failed' } }));
        
        return Promise.reject(refreshError);
      }
    }

    // Show error toast for non-401 errors (401 is handled above or will trigger logout)
    // Skip showing toast for requests that explicitly disable it via custom config
    const skipToast = (originalRequest as any)._skipErrorToast;
    if (error.response && !skipToast && globalErrorHandler) {
      const message = formatErrorMessage(error);
      const variant = error.response.status >= 500 ? 'error' : error.response.status === 404 ? 'warning' : 'error';
      globalErrorHandler(message, variant);
    }

    return Promise.reject(error);
  }
);


