import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Send, CheckCircle, Error } from '@mui/icons-material';
import { api } from '../services/api';

export default function EmailTestPage() {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    checked: boolean;
    success: boolean;
    message: string;
    config?: any;
  }>({ checked: false, success: false, message: '' });
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setConnectionStatus({ checked: false, success: false, message: '' });
    setSendResult(null);

    try {
      const response = await api.get('/email/test-connection');
      setConnectionStatus({
        checked: true,
        success: response.data.success,
        message: response.data.message,
        config: response.data.config,
      });
    } catch (error: any) {
      setConnectionStatus({
        checked: true,
        success: false,
        message: error.response?.data?.message || 'Błąd sprawdzania połączenia',
        config: error.response?.data?.config,
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setSendResult({ success: false, message: 'Podaj adres email' });
      return;
    }

    setLoading(true);
    setSendResult(null);

    try {
      await api.post('/email/test', { to: testEmail });
      setSendResult({
        success: true,
        message: 'Testowy email wysłany pomyślnie! Sprawdź skrzynkę odbiorczą.',
      });
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Błąd wysyłania emaila',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Test konfiguracji email
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test połączenia SMTP
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sprawdź czy konfiguracja email działa poprawnie
            </Typography>

            <Button
              variant="contained"
              onClick={testConnection}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Sprawdź połączenie'}
            </Button>

            {connectionStatus.checked && (
              <Alert
                severity={connectionStatus.success ? 'success' : 'error'}
                icon={connectionStatus.success ? <CheckCircle /> : <Error />}
                sx={{ mt: 2 }}
              >
                {connectionStatus.message}
                {connectionStatus.config && (
                  <Box sx={{ mt: 2, fontSize: '0.875rem' }}>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      Konfiguracja:
                    </Typography>
                    <Typography>Host: {connectionStatus.config.host}</Typography>
                    <Typography>Port: {connectionStatus.config.port}</Typography>
                    <Typography>Secure: {connectionStatus.config.secure ? 'Tak' : 'Nie (STARTTLS)'}</Typography>
                    <Typography>User: {connectionStatus.config.user}</Typography>
                    <Typography>From: {connectionStatus.config.from}</Typography>
                  </Box>
                )}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Wyślij testowy email
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Wyślij testowy email na podany adres
            </Typography>

            <TextField
              fullWidth
              label="Adres email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={sendTestEmail}
              disabled={loading || !testEmail}
            >
              {loading ? 'Wysyłanie...' : 'Wyślij testowy email'}
            </Button>

            {sendResult && (
              <Alert
                severity={sendResult.success ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {sendResult.message}
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

