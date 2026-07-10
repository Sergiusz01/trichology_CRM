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
import { Visibility, VisibilityOff } from '@mui/icons-material';
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

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

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
          <Box sx={{ mx: 'auto', mb: 3 }}>
            <img src="/logo.png" alt="Logo" style={{ maxHeight: 80, maxWidth: '100%' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
            Zaloguj się
          </Typography>
        </Box>

        <AppCard noPadding>
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
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
