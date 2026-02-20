import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { ContentCopy, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Schemat walidacji Zod
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Adres email jest wymagany')
    .email('Nieprawidłowy adres email'),
  password: z.string()
    .min(1, 'Hasło jest wymagane')
    .min(6, 'Hasło musi mieć minimum 6 znaków'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const testEmail = 'agnieszka.polanska@example.com';
  const testPassword = 'test123';

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(testEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(testPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleFillTestData = () => {
    setValue('email', testEmail);
    setValue('password', testPassword);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Błąd logowania';
      setFormError('root', { message: errorMessage });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 } }}>
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2.5, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <Avatar
            sx={{
              m: 1,
              bgcolor: 'primary.main',
              width: { xs: 48, sm: 64 },
              height: { xs: 48, sm: 64 },
              fontSize: { xs: '1.5rem', sm: '2rem' },
              fontWeight: 'bold',
            }}
          >
            T
          </Avatar>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              mb: 1,
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
            }}
          >
            Logowanie
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: { xs: 2, sm: 3 },
              textAlign: 'center',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 0 },
            }}
          >
            System Zarządzania Konsultacjami Trychologicznymi
          </Typography>

          {/* Test Account Info - Only visible in development */}
          {import.meta.env.DEV && (
            <Card
              sx={{
                width: '100%',
                mb: 2,
                bgcolor: 'info.light',
                border: '2px solid',
                borderColor: 'info.main',
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'info.dark' }}>
                  ⚠️ Aplikacja w fazie testowej
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5, color: 'text.primary' }}>
                  Użyj poniższych danych testowych do logowania:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
                      <strong>Email:</strong> {testEmail}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyEmail}
                      title="Kopiuj email"
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                    {copiedEmail && (
                      <Typography variant="caption" color="success.main">
                        Skopiowano!
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
                      <strong>Hasło:</strong> {testPassword}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={handleCopyPassword}
                      title="Kopiuj hasło"
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                    {copiedPassword && (
                      <Typography variant="caption" color="success.main">
                        Skopiowano!
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={handleFillTestData}
                    sx={{ mt: 1 }}
                  >
                    Wypełnij dane testowe
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {errors.root && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }} onClose={() => { }}>
              {errors.root.message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%', mt: 1 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Adres email"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  size="medium"
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                    },
                  }}
                />
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  label="Hasło"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  size="medium"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                    },
                  }}
                />
              )}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: { xs: 2, sm: 3 },
                mb: 2,
                py: { xs: 1.25, sm: 1.5 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Zaloguj się'}
            </Button>
          </Box>

        </Paper>
      </Container>
    </Box>
  );
}
