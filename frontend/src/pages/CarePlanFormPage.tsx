import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { api } from '../services/api';

export default function CarePlanFormPage() {
  const { id, carePlanId } = useParams<{ id?: string; carePlanId?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    patientId: id || '',
    consultationId: '',
    title: '',
    totalDurationWeeks: 4,
    notes: '',
    isActive: true,
  });
  const [weeks, setWeeks] = useState<Array<{
    weekNumber: number;
    description: string;
    washingRoutine: string;
    topicalProducts: string;
    supplements: string;
    inClinicProcedures: string;
    remarks: string;
  }>>([]);

  useEffect(() => {
    if (carePlanId) {
      fetchCarePlan();
    } else {
      // Initialize with default weeks
      initializeWeeks(4);
    }
  }, [carePlanId]);

  useEffect(() => {
    if (formData.totalDurationWeeks > 0) {
      initializeWeeks(formData.totalDurationWeeks);
    }
  }, [formData.totalDurationWeeks]);

  const initializeWeeks = (count: number) => {
    const newWeeks = Array.from({ length: count }, (_, i) => ({
      weekNumber: i + 1,
      description: '',
      washingRoutine: '',
      topicalProducts: '',
      supplements: '',
      inClinicProcedures: '',
      remarks: '',
    }));
    setWeeks(newWeeks);
  };

  const fetchCarePlan = async () => {
    if (!carePlanId) return;
    try {
      setLoadingData(true);
      const response = await api.get(`/care-plans/${carePlanId}`);
      const plan = response.data.carePlan;

      setFormData({
        patientId: plan.patientId || id || '',
        consultationId: plan.consultationId || '',
        title: plan.title || '',
        totalDurationWeeks: plan.totalDurationWeeks || 4,
        notes: plan.notes || '',
        isActive: plan.isActive !== undefined ? plan.isActive : true,
      });

      if (plan.weeks && plan.weeks.length > 0) {
        setWeeks(plan.weeks.map((week: any) => ({
          weekNumber: week.weekNumber,
          description: week.description || '',
          washingRoutine: week.washingRoutine || '',
          topicalProducts: week.topicalProducts || '',
          supplements: week.supplements || '',
          inClinicProcedures: week.inClinicProcedures || '',
          remarks: week.remarks || '',
        })));
      } else {
        initializeWeeks(plan.totalDurationWeeks || 4);
      }
    } catch (error: any) {
      console.error('Błąd pobierania planu:', error);
      setError(error.response?.data?.error || 'Błąd pobierania planu');
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWeekChange = (index: number, field: string, value: string) => {
    const newWeeks = [...weeks];
    newWeeks[index] = { ...newWeeks[index], [field]: value };
    setWeeks(newWeeks);
  };

  const handleAddWeek = () => {
    setWeeks([...weeks, {
      weekNumber: weeks.length + 1,
      description: '',
      washingRoutine: '',
      topicalProducts: '',
      supplements: '',
      inClinicProcedures: '',
      remarks: '',
    }]);
    setFormData(prev => ({ ...prev, totalDurationWeeks: prev.totalDurationWeeks + 1 }));
  };

  const handleRemoveWeek = (index: number) => {
    if (weeks.length <= 1) {
      setError('Musi być co najmniej jeden tydzień');
      return;
    }
    const newWeeks = weeks.filter((_, i) => i !== index);
    // Renumber weeks
    const renumberedWeeks = newWeeks.map((week, i) => ({
      ...week,
      weekNumber: i + 1,
    }));
    setWeeks(renumberedWeeks);
    setFormData(prev => ({ ...prev, totalDurationWeeks: prev.totalDurationWeeks - 1 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const dataToSend = {
        ...formData,
        consultationId: formData.consultationId && formData.consultationId.trim() !== ''
          ? formData.consultationId
          : undefined,
        weeks: weeks.filter(week =>
          week.description ||
          week.washingRoutine ||
          week.topicalProducts ||
          week.supplements ||
          week.inClinicProcedures ||
          week.remarks
        ),
      };

      if (carePlanId) {
        await api.put(`/care-plans/${carePlanId}`, dataToSend);
      } else {
        await api.post('/care-plans', dataToSend);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(`/patients/${id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Błąd zapisywania planu:', err);
      setError(err.response?.data?.error || err.message || 'Błąd zapisywania planu');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden', px: { xs: 0, sm: 0 } }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontSize: { xs: '1.5rem', sm: '2rem' },
          mb: { xs: 2, sm: 3 },
          px: { xs: 1.5, sm: 0 },
        }}
      >
        {carePlanId ? 'Edytuj plan opieki' : 'Nowy plan opieki'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Plan opieki zapisany pomyślnie!
        </Alert>
      )}

      <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: { xs: 1.5, sm: 2 } }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Tytuł planu"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Czas trwania (tygodnie)"
                type="number"
                value={formData.totalDurationWeeks}
                onChange={(e) => handleChange('totalDurationWeeks', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1 }}
                required
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Uwagi ogólne"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                multiline
                rows={4}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Tygodnie planu</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddWeek}
                >
                  Dodaj tydzień
                </Button>
              </Box>

              {weeks.map((week, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Tydzień {week.weekNumber}</Typography>
                      {weeks.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveWeek(index)}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Opis"
                          value={week.description}
                          onChange={(e) => handleWeekChange(index, 'description', e.target.value)}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Rutyna mycia"
                          value={week.washingRoutine}
                          onChange={(e) => handleWeekChange(index, 'washingRoutine', e.target.value)}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Produkty miejscowe"
                          value={week.topicalProducts}
                          onChange={(e) => handleWeekChange(index, 'topicalProducts', e.target.value)}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Suplementacja"
                          value={week.supplements}
                          onChange={(e) => handleWeekChange(index, 'supplements', e.target.value)}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Zabiegi w klinice"
                          value={week.inClinicProcedures}
                          onChange={(e) => handleWeekChange(index, 'inClinicProcedures', e.target.value)}
                          multiline
                          rows={2}
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Uwagi"
                          value={week.remarks}
                          onChange={(e) => handleWeekChange(index, 'remarks', e.target.value)}
                          multiline
                          rows={2}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{
                display: 'flex',
                gap: { xs: 1, sm: 2 },
                justifyContent: 'flex-end',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                mt: { xs: 1.5, sm: 2 },
              }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/patients/${id}`)}
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
                  {loading ? <CircularProgress size={24} /> : (isMobile ? 'Zapisz' : 'Zapisz plan')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

