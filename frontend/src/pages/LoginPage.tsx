import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Container,
  Typography,
  Box,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { ContentCopy, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { AppTextField, AppButton, AppCard } from '../ui';

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
      <Container maxWidth="xs">
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)'
          }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>T</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
            Zaloguj się
          </Typography>
          <Typography variant="body2" color="text.secondary">
            System Zarządzania Light Clinic
          </Typography>
        </Box>

        <AppCard noPadding>
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {/* Test Account Info - Only visible in development */}
            {import.meta.env.DEV && (
              <Box sx={{ mb: 3, p: 2, bgcolor: '#F0F9FF', borderRadius: 2, border: '1px solid #BAE6FD' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#0284C7', display: 'block', mb: 1, textTransform: 'uppercase' }}>
                  Dane testowe (DEV)
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1, color: '#0F172A' }}>{testEmail}</Typography>
                  <AppButton size="small" variant="text" onClick={handleCopyEmail} sx={{ minWidth: 0, p: 0.5 }}>
                    {copiedEmail ? <Typography variant="caption" color="success.main" fontWeight={600}>OK</Typography> : <ContentCopy sx={{ fontSize: 16 }} />}
                  </AppButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1, color: '#0F172A' }}>{testPassword}</Typography>
                  <AppButton size="small" variant="text" onClick={handleCopyPassword} sx={{ minWidth: 0, p: 0.5 }}>
                    {copiedPassword ? <Typography variant="caption" color="success.main" fontWeight={600}>OK</Typography> : <ContentCopy sx={{ fontSize: 16 }} />}
                  </AppButton>
                </Box>

                <AppButton variant="outlined" size="small" fullWidth onClick={handleFillTestData} sx={{ bgcolor: '#FFF' }}>
                  Wypełnij
                </AppButton>
              </Box>
            )}

            {errors.root && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => { }}>
                {errors.root.message}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <AppTextField
                name="email"
                control={control}
                label="Adres e-mail"
                placeholder="jan.kowalski@example.com"
                fullWidth
                autoComplete="email"
                autoFocus
                required
              />

              <AppTextField
                name="password"
                control={control}
                label="Hasło"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                fullWidth
                autoComplete="current-password"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <AppButton
                type="submit"
                fullWidth
                variant="contained"
                loading={isSubmitting}
                sx={{ mt: 2 }}
                size="large"
              >
                Zaloguj się
              </AppButton>
            </Box>
          </Box>
        </AppCard>
      </Container>
    </Box>
  );
}
