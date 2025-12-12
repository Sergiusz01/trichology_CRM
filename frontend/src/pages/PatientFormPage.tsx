import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { api } from '../services/api';

export default function PatientFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    occupation: '',
    address: '',
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchPatient();
    }
  }, [id]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/patients/${id}`);
      const patient = response.data.patient;
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        age: patient.age?.toString() || '',
        gender: patient.gender || '',
        phone: patient.phone || '',
        email: patient.email || '',
        occupation: patient.occupation || '',
        address: patient.address || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd pobierania danych pacjenta');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        email: formData.email || undefined,
      };

      if (id && id !== 'new') {
        await api.put(`/patients/${id}`, data);
      } else {
        const response = await api.post('/patients', data);
        navigate(`/patients/${response.data.patient.id}`);
        return;
      }

      navigate(`/patients/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd zapisywania pacjenta');
    } finally {
      setLoading(false);
    }
  };

  if (loading && id && id !== 'new') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {id && id !== 'new' ? 'Edycja pacjenta' : 'Nowy pacjent'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Imię"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Nazwisko"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Wiek"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                inputProps={{ min: 0, max: 150 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Płeć"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <MenuItem value="">Brak</MenuItem>
                <MenuItem value="MALE">Mężczyzna</MenuItem>
                <MenuItem value="FEMALE">Kobieta</MenuItem>
                <MenuItem value="OTHER">Inna</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Zawód"
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                name="address"
                multiline
                rows={2}
                value={formData.address}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 1, sm: 2 }, 
                justifyContent: 'flex-end',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
              }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/patients')}
                  disabled={loading}
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
                  disabled={loading}
                  fullWidth={isMobile}
                  size={isMobile ? 'medium' : 'large'}
                  sx={{ 
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    py: { xs: 1.25, sm: 1.5 },
                  }}
                >
                  {loading ? 'Zapisywanie...' : (isMobile ? 'Zapisz' : (id && id !== 'new' ? 'Zapisz zmiany' : 'Utwórz pacjenta'))}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

