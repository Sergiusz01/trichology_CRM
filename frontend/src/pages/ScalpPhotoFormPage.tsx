import { useState } from 'react';
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
  Alert,
  CircularProgress,
  Container,
  alpha,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

// Schemat walidacji Zod
const scalpPhotoSchema = z.object({
  photo: z.instanceof(File, { message: 'Proszę wybrać plik' })
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Plik nie może być większy niż 10MB')
    .refine((file) => file.type.startsWith('image/'), 'Plik musi być obrazem'),
  notes: z.string().max(1000, 'Notatki mogą mieć maksymalnie 1000 znaków').optional().or(z.literal('')),
});

type ScalpPhotoFormData = z.infer<typeof scalpPhotoSchema>;

export default function ScalpPhotoFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ScalpPhotoFormData>({
    resolver: zodResolver(scalpPhotoSchema),
    defaultValues: {
      photo: undefined as any,
      notes: '',
    },
  });

  const selectedFile = watch('photo');

  const onSubmit = async (data: ScalpPhotoFormData) => {
    try {
      const formData = new FormData();
      formData.append('photo', data.photo);
      if (data.notes) {
        formData.append('notes', data.notes);
      }

      await api.post(`/scalp-photos/patient/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
      enqueueSnackbar('Zdjęcie przesłane pomyślnie!', { variant: 'success' });
      setTimeout(() => {
        navigate(`/patients/${id}`, { state: { refresh: true } });
      }, 1500);
    } catch (err: any) {
      console.error('Błąd przesyłania zdjęcia:', err);
      enqueueSnackbar(
        err.response?.data?.error || err.message || 'Błąd przesyłania zdjęcia',
        { variant: 'error' }
      );
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1d1d1f' }}>
          Dodaj zdjęcie skóry głowy
        </Typography>
      </Box>

      {errors.root && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errors.root.message}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          Zdjęcie przesłane pomyślnie!
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'white'
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="photo"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <>
                    <input
                      {...field}
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="photo-upload"
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onChange(file);
                        }
                      }}
                    />
                    <label htmlFor="photo-upload" style={{ width: '100%' }}>
                      <Box
                        sx={{
                          border: '2px dashed',
                          borderColor: errors.photo ? 'error.main' : (selectedFile ? '#34C759' : '#d2d2d7'),
                          borderRadius: 3,
                          p: 4,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          bgcolor: selectedFile ? alpha('#34C759', 0.02) : alpha('#f5f5f7', 0.5),
                          '&:hover': {
                            borderColor: '#007AFF',
                            bgcolor: alpha('#007AFF', 0.02),
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ color: '#1d1d1f', mb: 1, fontWeight: 700 }}>
                          {selectedFile ? 'Zmieniono plik' : 'Wybierz zdjęcie lub przeciągnij'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedFile ? selectedFile.name : 'Dozwolone formaty: JPG, PNG (max 10MB)'}
                        </Typography>
                        <Button
                          variant="contained"
                          component="span"
                          sx={{
                            mt: 3,
                            bgcolor: '#007AFF',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 2
                          }}
                        >
                          Wybierz z dysku
                        </Button>
                      </Box>
                    </label>
                    {errors.photo && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        {errors.photo.message}
                      </Typography>
                    )}
                  </>
                )}
              />

              {selectedFile && (
                <Box sx={{ mt: 3, width: '100%', position: 'relative', borderRadius: 3, overflow: 'hidden', border: '1px solid #d2d2d7' }}>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Podgląd"
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      display: 'block',
                      backgroundColor: '#f5f5f7'
                    }}
                  />
                </Box>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={4}
                    label="Uwagi i opis zdjęcia"
                    placeholder="Np. widoczne zaczerwienienie w okolicach skroni..."
                    error={!!errors.notes}
                    helperText={errors.notes?.message}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                      }
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || !selectedFile}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    bgcolor: '#1d1d1f',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 3,
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: '#000',
                      boxShadow: 'none',
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#f5f5f7'
                    }
                  }}
                >
                  {isSubmitting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Zapisz zdjęcie w dokumentacji'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/patients/${id}`)}
                  sx={{
                    px: 4,
                    borderColor: '#d2d2d7',
                    color: '#1d1d1f',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 3,
                    '&:hover': {
                      borderColor: '#1d1d1f',
                      bgcolor: alpha('#000', 0.02),
                    }
                  }}
                >
                  Anuluj
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
