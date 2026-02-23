import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from 'notistack';
import { AuthProvider } from './contexts/AuthContext';
import { ApiErrorHandler } from './components/ApiErrorHandler';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CustomThemeProvider>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <ApiErrorHandler />
          <AuthProvider>
            <App />
          </AuthProvider>
        </SnackbarProvider>
      </CustomThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);


