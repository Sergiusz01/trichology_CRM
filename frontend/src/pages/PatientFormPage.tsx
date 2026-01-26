import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

// Schemat walidacji Zod - POPRAWIONY
const patientSchema = z.object({
  firstName: z.string()
    .min(2, 'Imię musi mieć minimum 2 znaki')
    .max(50, 'Imię może mieć maksymalnie 50 znaków')
    .regex(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/, 'Imię może zawierać tylko litery'),
  lastName: z.string()
    .min(2, 'Nazwisko musi mieć minimum 2 znaki')
    .max(50, 'Nazwisko może mieć maksymalnie 50 znaków')
    .regex(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/, 'Nazwisko może zawierać tylko litery'),
  // POPRAWKA: Użyj z.coerce.number() dla automatycznej konwersji string -> number
  age: z.coerce.number()
    .int('Wiek musi być liczbą całkowitą')
    .min(0, 'Wiek nie może być ujemny')
    .max(150, 'Wiek nie może przekraczać 150 lat')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', '']).optional(),
  phone: z.string()
    .regex(/^[0-9\s\-\+\(\)]*$/, 'Nieprawidłowy format telefonu')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Nieprawidłowy adres email')
    .optional()
    .or(z.literal('')),
  occupation: z.string()
    .max(100, 'Zawód może mieć maksymalnie 100 znaków')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .max(200, 'Adres może mieć maksymalnie 200 znaków')
    .optional()
    .or(z.literal('')),
});

type PatientFormData = z.infer<typeof patientSchema>;

export default function PatientFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      age: '' as any,
      gender: '',
      phone: '',
      email: '',
      occupation: '',
      address: '',
    },
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchPatient();
    }
  }, [id]);

  const fetchPatient = async () => {
    try {
      const response = await api.get(`/patients/${id}`);
      const patient = response.data.patient;
      reset({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age || ('' as any),
        gender: patient.gender || '',
        phone: patient.phone || '',
        email: patient.email || '',
        occupation: patient.occupation || '',
        address: patient.address || '',
      });
    } catch (err: any) {
      enqueueSnackbar(
        err.response?.data?.error || 'Błąd pobierania danych pacjenta',
        { variant: 'error' }
      );
    }
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        age: data.age ? Number(data.age) : undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        occupation: data.occupation || undefined,
        address: data.address || undefined,
        gender: data.gender || undefined,
      };

      if (id && id !== 'new') {
        await api.put(`/patients/${id}`, payload);
        enqueueSnackbar('Pacjent zaktualizowany pomyślnie', { variant: 'success' });
        navigate(`/patients/${id}`);
      } else {
        const response = await api.post('/patients', payload);
        enqueueSnackbar('Pacjent utworzony pomyślnie', { variant: 'success' });
        navigate(`/patients/${response.data.patient.id}`);
      }
    } catch (err: any) {
      enqueueSnackbar(
        err.response?.data?.error || 'Błąd zapisywania pacjenta',
        { variant: 'error' }
      );
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {id && id !== 'new' ? 'Edycja pacjenta' : 'Nowy pacjent'}
      </Typography>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    required
                    label="Imię"
                    error={!!errors.firstName}
                    helperText={errors.firstName?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    required
                    label="Nazwisko"
                    error={!!errors.lastName}
                    helperText={errors.lastName?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="age"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Wiek"
                    type="number"
                    error={!!errors.age}
                    helperText={errors.age?.message}
                    inputProps={{ min: 0, max: 150 }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    select
                    label="Płeć"
                    error={!!errors.gender}
                    helperText={errors.gender?.message}
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="MALE">Mężczyzna</MenuItem>
                    <MenuItem value="FEMALE">Kobieta</MenuItem>
                    <MenuItem value="OTHER">Inna</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Telefon"
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    placeholder="np. +48 123 456 789"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    placeholder="np. jan.kowalski@example.com"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="occupation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Zawód"
                    error={!!errors.occupation}
                    helperText={errors.occupation?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Adres"
                    multiline
                    rows={2}
                    error={!!errors.address}
                    helperText={errors.address?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 1, sm: 2 },
                  justifyContent: 'flex-end',
                  flexDirection: { xs: 'column-reverse', sm: 'row' },
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => navigate('/patients')}
                  disabled={isSubmitting}
                  fullWidth={isMobile}
                  size={isMobile ? 'medium' : 'large'}
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    py: { xs: 1.25, sm: 1.5 },
                  }}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  fullWidth={isMobile}
                  size={isMobile ? 'medium' : 'large'}
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    py: { xs: 1.25, sm: 1.5 },
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Zapisywanie...
                    </>
                  ) : isMobile ? (
                    'Zapisz'
                  ) : id && id !== 'new' ? (
                    'Zapisz zmiany'
                  ) : (
                    'Utwórz pacjenta'
                  )}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
