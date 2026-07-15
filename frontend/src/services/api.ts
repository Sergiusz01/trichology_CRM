import axios from 'axios';

// Produkcja (za Nginx): nie ustawiaj VITE_API_URL → używamy względnego /api (brak CORS przy samej domenie).
// Lokalnie: VITE_API_URL=http://localhost:3001 w .env – frontend na :5173, API na :3001.
const API_URL = import.meta.env.VITE_API_URL || '';

export const BASE_URL = API_URL;

export const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // [SEC-10] Send httpOnly cookies with requests
});

// [SEC-10] Access token is now an httpOnly cookie — no localStorage, no Authorization header needed
api.interceptors.request.use((config) => {
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
const formatErrorMessage = (error: unknown): string => {
  if (!navigator.onLine) {
    return 'Jesteś w trybie offline. Sprawdź połączenie z internetem.';
  }

  if (!axios.isAxiosError(error)) {
    return 'Nieoczekiwany błąd';
  }

  if (!error.response) {
    return 'Brak połączenia z serwerem. Sprawdź internet lub status backendu.';
  }

  const { status, data } = error.response as {
    status: number;
    data: { message?: string; error?: string; details?: Array<{ field?: string; message?: string }> };
  };

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
        // [SEC-10] Both tokens travel as httpOnly cookies — server sets new accessToken cookie on success
        const refreshUrl = API_URL ? `${API_URL}/api/auth/refresh` : '/api/auth/refresh';
        const lastActivityTime = localStorage.getItem('lastActivityTime');
        await axios.post(refreshUrl, {
          ...(lastActivityTime !== null && { lastActivityTime: parseInt(lastActivityTime, 10) }),
        }, { withCredentials: true });

        return api(originalRequest);
      } catch (refreshError) {
        // Clear activity timestamp on refresh failure
        localStorage.removeItem('lastActivityTime');

        // Dispatch custom event for AuthContext to handle navigation
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_refresh_failed' } }));

        return Promise.reject(refreshError);
      }
    }

    // Show error toast for non-401 errors (401 is handled above or will trigger logout)
    // Also show toast if it's a network error (no response)
    const skipToast = originalRequest._skipErrorToast;
    if (!skipToast && globalErrorHandler && (!error.response || error.response.status !== 401)) {
      const message = formatErrorMessage(error);
      const isNetworkError = !error.response;
      const variant = isNetworkError || error.response?.status >= 500 ? 'error' : error.response?.status === 404 ? 'warning' : 'error';
      globalErrorHandler(message, variant);
    }

    return Promise.reject(error);
  }
);


