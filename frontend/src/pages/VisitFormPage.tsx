import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  alpha,
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { VISIT_STATUS_CONFIG } from '../constants/visitStatus';

const MINUTE_OPTIONS = ['00', '15', '30', '45'] as const;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

function roundToNearestMinutes(date: Date): { h: string; m: string } {
  const m = date.getMinutes();
  const options = [0, 15, 30, 45];
  const nearest = options.reduce((a, b) => (Math.abs(m - a) <= Math.abs(m - b) ? a : b));
  const d = new Date(date);
  d.setMinutes(nearest, 0, 0);
  return {
    h: String(d.getHours()).padStart(2, '0'),
    m: String(d.getMinutes()).padStart(2, '0'),
  };
}

function roundToNearestMinutesUTC(date: Date): { h: string; m: string } {
  const m = date.getUTCMinutes();
  const options = [0, 15, 30, 45];
  const nearest = options.reduce((a, b) => (Math.abs(m - a) <= Math.abs(m - b) ? a : b));
  const h = date.getUTCHours();
  return {
    h: String(h).padStart(2, '0'),
    m: String(nearest).padStart(2, '0'),
  };
}

export default function VisitFormPage() {
  const { id, patientId } = useParams<{ id?: string; patientId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { success: showSuccess, error: showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);

  // Check if we're creating a new visit by checking the URL path
  const isNewVisit = location.pathname.includes('/visits/new') || (!id && patientId);
  // If we're on /patients/:id/visits/new, then id is actually the patientId
  const actualPatientId = location.pathname.includes('/visits/new') ? id : (patientId || id);
  const actualVisitId = location.pathname.includes('/visits/new') ? undefined : id;

  const initDateTime = (() => {
    const now = new Date();
    const { h, m } = roundToNearestMinutes(now);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const minute = (MINUTE_OPTIONS as readonly string[]).includes(m) ? m : '00';
    return {
      datePart: `${year}-${month}-${day}`,
      hour: h,
      minute,
    };
  })();

  const [formData, setFormData] = useState({
    patientId: actualPatientId || '',
    datePart: initDateTime.datePart,
    hour: initDateTime.hour,
    minute: initDateTime.minute,
    rodzajZabiegu: '',
    notatki: '',
    status: 'ZAPLANOWANA' as 'ZAPLANOWANA' | 'ODBYTA' | 'NIEOBECNOSC' | 'ANULOWANA',
    numerWSerii: '',
    liczbaSerii: '',
    cena: '',
  });

  useEffect(() => {
    // Fetch patients list if no patientId is provided
    if (!actualPatientId) {
      fetchPatients();
    } else {
      setFormData((prev) => ({
        ...prev,
        patientId: actualPatientId,
      }));
    }

    // Fetch visit if editing
    if (actualVisitId && !isNewVisit) {
      fetchVisit();
    }
  }, [actualVisitId, actualPatientId, isNewVisit]);

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const response = await api.get('/patients');
      setPatients(response.data.patients || []);
    } catch (err: any) {
      showError('Nie udało się załadować listy pacjentów');
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchVisit = async () => {
    if (!actualVisitId || isNewVisit) return;

    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/visits/${actualVisitId}`);
      const visit = response.data.visit;

      if (!visit) {
        setError('Wizyta nie znaleziona');
        setLoading(false);
        return;
      }

      const visitDate = new Date(visit.data);
      const year = visitDate.getUTCFullYear();
      const month = String(visitDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(visitDate.getUTCDate()).padStart(2, '0');
      const { h: hours, m: minutes } = roundToNearestMinutesUTC(visitDate);
      const minute = (MINUTE_OPTIONS as readonly string[]).includes(minutes) ? minutes : '00';

      setFormData({
        patientId: visit.patientId,
        datePart: `${year}-${month}-${day}`,
        hour: hours,
        minute,
        rodzajZabiegu: visit.rodzajZabiegu || '',
        notatki: visit.notatki || '',
        status: visit.status || 'ZAPLANOWANA',
        numerWSerii: visit.numerWSerii?.toString() || '',
        liczbaSerii: visit.liczbaSerii?.toString() || '',
        cena: visit.cena?.toString() || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nie udało się załadować wizyty');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.patientId) {
      setError('Wybierz pacjenta');
      return;
    }

    if (!formData.rodzajZabiegu.trim()) {
      setError('Rodzaj zabiegu jest wymagany');
      return;
    }

    try {
      setLoading(true);

      const data = `${formData.datePart}T${formData.hour}:${formData.minute}`;
      const visitData: any = {
        patientId: formData.patientId,
        data,
        rodzajZabiegu: formData.rodzajZabiegu.trim(),
        status: formData.status,
      };

      if (formData.notatki.trim()) {
        visitData.notatki = formData.notatki.trim();
      }

      if (formData.numerWSerii) {
        visitData.numerWSerii = parseInt(formData.numerWSerii, 10);
      }

      if (formData.liczbaSerii) {
        visitData.liczbaSerii = parseInt(formData.liczbaSerii, 10);
      }

      if (formData.cena) {
        visitData.cena = parseFloat(formData.cena);
      }

      if (actualVisitId && !isNewVisit) {
        await api.put(`/visits/${actualVisitId}`, visitData);
        showSuccess('Wizyta została zaktualizowana');
      } else {
        await api.post('/visits', visitData);
        showSuccess('Wizyta została dodana');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(`/patients/${formData.patientId}`);
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Błąd podczas zapisywania wizyty';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === formData.patientId);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: alpha('#1976d2', 0.1), '&:hover': { bgcolor: alpha('#1976d2', 0.2) } }}>
            <ArrowBack sx={{ color: '#1976d2' }} />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {actualVisitId && !isNewVisit ? 'Edytuj wizytę' : 'Nowa wizyta / zabieg'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {actualVisitId && !isNewVisit ? 'Wizyta została zaktualizowana' : 'Wizyta została dodana'}
          </Alert>
        )}

        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Patient Selection */}
              {!actualPatientId && (
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    options={patients}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                    value={selectedPatient || null}
                    onChange={(_, newValue) => {
                      handleChange('patientId', newValue?.id || '');
                    }}
                    loading={loadingPatients}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Pacjent *"
                        required
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingPatients ? <CircularProgress size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
              )}

              {/* Data */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Data *"
                  type="date"
                  value={formData.datePart}
                  onChange={(e) => handleChange('datePart', e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {/* Godzina (24h) */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Godzina</InputLabel>
                  <Select
                    label="Godzina"
                    value={formData.hour}
                    onChange={(e) => handleChange('hour', e.target.value)}
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <MenuItem key={h} value={h}>
                        {h}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {/* Minuty – tylko 00, 15, 30, 45 */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Minuty</InputLabel>
                  <Select
                    label="Minuty"
                    value={formData.minute}
                    onChange={(e) => handleChange('minute', e.target.value)}
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <MenuItem key={m} value={m}>
                        :{m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Godzina w formacie 24h. Minuty: tylko 00, 15, 30, 45.
                </Typography>
              </Grid>

              {/* Treatment Type */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Rodzaj zabiegu *"
                  value={formData.rodzajZabiegu}
                  onChange={(e) => handleChange('rodzajZabiegu', e.target.value)}
                  required
                />
              </Grid>

              {/* Status */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    label="Status"
                  >
                    {Object.entries(VISIT_STATUS_CONFIG).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Series Number */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Numer w serii"
                  type="number"
                  value={formData.numerWSerii}
                  onChange={(e) => handleChange('numerWSerii', e.target.value)}
                  inputProps={{ min: 1 }}
                />
              </Grid>

              {/* Total Series */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Liczba serii"
                  type="number"
                  value={formData.liczbaSerii}
                  onChange={(e) => handleChange('liczbaSerii', e.target.value)}
                  inputProps={{ min: 1 }}
                />
              </Grid>

              {/* Price */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Cena (zł)"
                  type="number"
                  value={formData.cena}
                  onChange={(e) => handleChange('cena', e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">zł</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Notes */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notatki"
                  multiline
                  rows={4}
                  value={formData.notatki}
                  onChange={(e) => handleChange('notatki', e.target.value)}
                />
              </Grid>

              {/* Submit Button */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(-1)}
                    disabled={loading}
                  >
                    Anuluj
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                    disabled={loading}
                    sx={{
                      bgcolor: '#1976d2',
                      '&:hover': { bgcolor: '#1565c0' },
                    }}
                  >
                    {loading ? 'Zapisywanie...' : 'Zapisz'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
