import { useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { setupApiErrorHandler } from '../services/api';

/**
 * Component that sets up global API error handling using notistack
 * Must be rendered inside SnackbarProvider
 */
export const ApiErrorHandler: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setupApiErrorHandler((message: string, variant: 'error' | 'warning' | 'info') => {
      enqueueSnackbar(message, { variant });
    });
  }, [enqueueSnackbar]);

  return null;
};
