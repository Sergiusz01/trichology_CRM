import { Alert, Button, Box } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface ErrorRetryProps {
  message: string;
  onRetry: () => void;
  onClose?: () => void;
}

/**
 * Component that displays an error message with a retry button
 */
export const ErrorRetry: React.FC<ErrorRetryProps> = ({ message, onRetry, onClose }) => {
  return (
    <Alert
      severity="error"
      action={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            startIcon={<Refresh />}
          >
            Spróbuj ponownie
          </Button>
          {onClose && (
            <Button color="inherit" size="small" onClick={onClose}>
              Zamknij
            </Button>
          )}
        </Box>
      }
      sx={{ mb: 2 }}
    >
      {message}
    </Alert>
  );
};
