import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

type Toast = {
  open: boolean;
  message: string;
  severity: ToastSeverity;
};

type ToastContextType = {
  showToast: (message: string, severity?: ToastSeverity) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = (message: string, severity: ToastSeverity = 'info') => {
    setToast({ open: true, message, severity });
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ message: string; severity?: ToastSeverity }>;
      if (ce.detail?.message) showToast(ce.detail.message, ce.detail.severity || 'error');
    };
    window.addEventListener('app-toast', handler as EventListener);
    return () => window.removeEventListener('app-toast', handler as EventListener);
  }, []);

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};



