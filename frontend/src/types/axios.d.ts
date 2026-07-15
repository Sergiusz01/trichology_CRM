import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    _skipErrorToast?: boolean;
    _retry?: boolean;
  }

  interface InternalAxiosRequestConfig {
    _skipErrorToast?: boolean;
    _retry?: boolean;
  }
}
