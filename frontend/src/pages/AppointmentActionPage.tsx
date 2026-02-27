import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Button,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

type ActionType = 'confirm' | 'cancel' | 'reschedule';
type ResultState = 'loading' | 'success' | 'already_done' | 'expired' | 'invalid' | 'error';

interface ResultConfig {
  icon: React.ReactNode;
  title: string;
  color: string;
  bgColor: string;
}

const RESULT_CONFIG: Record<ResultState, ResultConfig> = {
  loading: {
    icon: <CircularProgress size={56} />,
    title: 'Przetwarzanie…',
    color: '#1976d2',
    bgColor: 'rgba(25, 118, 210, 0.08)',
  },
  success: {
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 64, color: '#34C759' }} />,
    title: 'Gotowe!',
    color: '#34C759',
    bgColor: 'rgba(52, 199, 89, 0.08)',
  },
  already_done: {
    icon: <CheckCircleOutlineIcon sx={{ fontSize: 64, color: '#34C759' }} />,
    title: 'Akcja już zarejestrowana',
    color: '#34C759',
    bgColor: 'rgba(52, 199, 89, 0.08)',
  },
  expired: {
    icon: <ErrorOutlineIcon sx={{ fontSize: 64, color: '#FF9500' }} />,
    title: 'Link wygasł',
    color: '#FF9500',
    bgColor: 'rgba(255, 149, 0, 0.08)',
  },
  invalid: {
    icon: <ErrorOutlineIcon sx={{ fontSize: 64, color: '#FF3B30' }} />,
    title: 'Nieprawidłowy link',
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.08)',
  },
  error: {
    icon: <CancelOutlinedIcon sx={{ fontSize: 64, color: '#FF3B30' }} />,
    title: 'Błąd',
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.08)',
  },
};

const ACTION_TITLES: Record<ActionType, string> = {
  confirm: 'Wizyta potwierdzona',
  cancel: 'Wizyta anulowana',
  reschedule: 'Prośba o zmianę terminu wysłana',
};

const ACTION_MESSAGES: Record<ActionType, string> = {
  confirm: 'Dziękujemy! Twoja wizyta została potwierdzona. Do zobaczenia!',
  cancel: 'Wizyta została anulowana. Jeśli chcesz umówić nowy termin, skontaktuj się z kliniką.',
  reschedule: 'Prośba o zmianę terminu została przekazana do kliniki. Skontaktujemy się z Tobą wkrótce.',
};

export default function AppointmentActionPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [resultState, setResultState] = useState<ResultState>('loading');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [action, setAction] = useState<ActionType | null>(null);

  useEffect(() => {
    if (!token) {
      setResultState('invalid');
      setTitle('Nieprawidłowy link');
      setMessage('Link jest niekompletny. Sprawdź treść wiadomości email.');
      return;
    }

    const apiBase = (import.meta as any).env?.VITE_API_URL || '';
    const url = `${apiBase}/api/appointment-actions?token=${encodeURIComponent(token)}`;

    // We fetch the endpoint which returns an HTML page or a redirect
    // Since the backend returns HTML directly, we need a different approach:
    // Use a direct navigation or parse the response.
    // Simplest: fetch as text and check HTTP status.
    fetch(url)
      .then(async (res) => {
        if (res.ok) {
          // Try to detect the action type from token payload (JWT, but we won't re-verify here)
          // Instead, show a generic success
          try {
            // Decode JWT payload (not verifying signature here — just reading action)
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.action) setAction(payload.action as ActionType);
            }
          } catch (_) {
            // ignore decode errors
          }
          setResultState('success');
          setTitle('Akcja zarejestrowana');
          setMessage('Dziękujemy! Twoja odpowiedź została przekazana do kliniki.');
        } else if (res.status === 410) {
          setResultState('expired');
          setTitle('Link wygasł');
          setMessage('Ten link działał przez 48 godzin i już wygasł. Skontaktuj się z kliniką, aby zmienić status wizyty.');
        } else if (res.status === 400 || res.status === 404) {
          setResultState('invalid');
          setTitle('Nieprawidłowy link');
          setMessage('Link jest nieprawidłowy lub nieaktualny. Sprawdź treść wiadomości email.');
        } else {
          setResultState('error');
          setTitle('Błąd');
          setMessage('Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub skontaktuj się z kliniką.');
        }
      })
      .catch(() => {
        setResultState('error');
        setTitle('Błąd połączenia');
        setMessage('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie.');
      });
  }, [token]);

  const cfg = RESULT_CONFIG[resultState];

  // If action resolved, override title/message with specific text
  const displayTitle = resultState === 'success' && action
    ? ACTION_TITLES[action]
    : (title || cfg.title);

  const displayMessage = resultState === 'success' && action
    ? ACTION_MESSAGES[action]
    : message;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f5f5f7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 4,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            bgcolor: cfg.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          {resultState === 'loading'
            ? <CircularProgress size={48} />
            : (action === 'cancel'
              ? <CancelOutlinedIcon sx={{ fontSize: 56, color: '#FF3B30' }} />
              : action === 'reschedule'
                ? <SwapHorizIcon sx={{ fontSize: 56, color: '#FF9500' }} />
                : cfg.icon
            )}
        </Box>

        <Typography variant="h5" fontWeight={700} gutterBottom>
          {displayTitle}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mt: 1 }}>
          {displayMessage}
        </Typography>

        {resultState !== 'loading' && (
          <Button
            variant="text"
            size="small"
            sx={{ mt: 4, color: 'text.disabled' }}
            onClick={() => window.close()}
          >
            Zamknij okno
          </Button>
        )}

        <Typography
          variant="caption"
          color="text.disabled"
          display="block"
          sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}
        >
          Klinika Trichologii · System CRM · Wiadomość automatyczna
        </Typography>
      </Paper>
    </Box>
  );
}
