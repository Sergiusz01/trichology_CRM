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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { api } from '../services/api';

export default function LabResultFormPage() {
  const { id, labResultId } = useParams<{ id?: string; labResultId?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loadingData, setLoadingData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    patientId: id || '',
    consultationId: '',
    date: new Date().toISOString().split('T')[0],
    // Morphology
    hgb: '',
    hgbUnit: 'g/dL',
    hgbRefLow: '',
    hgbRefHigh: '',
    rbc: '',
    rbcUnit: 'M/μL',
    rbcRefLow: '',
    rbcRefHigh: '',
    wbc: '',
    wbcUnit: 'K/μL',
    wbcRefLow: '',
    wbcRefHigh: '',
    plt: '',
    pltUnit: 'K/μL',
    pltRefLow: '',
    pltRefHigh: '',
    // Iron
    ferritin: '',
    ferritinUnit: 'ng/mL',
    ferritinRefLow: '',
    ferritinRefHigh: '',
    iron: '',
    ironUnit: 'μg/dL',
    ironRefLow: '',
    ironRefHigh: '',
    // Vitamins
    vitaminD3: '',
    vitaminD3Unit: 'ng/mL',
    vitaminD3RefLow: '',
    vitaminD3RefHigh: '',
    vitaminB12: '',
    vitaminB12Unit: 'pg/mL',
    vitaminB12RefLow: '',
    vitaminB12RefHigh: '',
    folicAcid: '',
    folicAcidUnit: 'ng/mL',
    folicAcidRefLow: '',
    folicAcidRefHigh: '',
    // Thyroid
    tsh: '',
    tshUnit: 'mIU/L',
    tshRefLow: '',
    tshRefHigh: '',
    ft3: '',
    ft3Unit: 'pg/mL',
    ft3RefLow: '',
    ft3RefHigh: '',
    ft4: '',
    ft4Unit: 'ng/dL',
    ft4RefLow: '',
    ft4RefHigh: '',
    // Notes
    notes: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Convert empty strings to undefined and numbers
      const dataToSend: any = {
        patientId: formData.patientId,
        date: formData.date ? new Date(formData.date).toISOString() : undefined,
        consultationId: formData.consultationId || undefined,
        notes: formData.notes || undefined,
      };

      // Helper to convert string to number or undefined
      const toNumber = (val: string) => (val === '' ? undefined : parseFloat(val));

      // Add all numeric fields
      const numericFields = [
        'hgb', 'hgbRefLow', 'hgbRefHigh',
        'rbc', 'rbcRefLow', 'rbcRefHigh',
        'wbc', 'wbcRefLow', 'wbcRefHigh',
        'plt', 'pltRefLow', 'pltRefHigh',
        'ferritin', 'ferritinRefLow', 'ferritinRefHigh',
        'iron', 'ironRefLow', 'ironRefHigh',
        'vitaminD3', 'vitaminD3RefLow', 'vitaminD3RefHigh',
        'vitaminB12', 'vitaminB12RefLow', 'vitaminB12RefHigh',
        'folicAcid', 'folicAcidRefLow', 'folicAcidRefHigh',
        'tsh', 'tshRefLow', 'tshRefHigh',
        'ft3', 'ft3RefLow', 'ft3RefHigh',
        'ft4', 'ft4RefLow', 'ft4RefHigh',
      ];

      numericFields.forEach((field) => {
        const value = toNumber(formData[field as keyof typeof formData] as string);
        if (value !== undefined) {
          dataToSend[field] = value;
        }
      });

      // Add unit fields
      const unitFields = [
        'hgbUnit', 'rbcUnit', 'wbcUnit', 'pltUnit',
        'ferritinUnit', 'ironUnit',
        'vitaminD3Unit', 'vitaminB12Unit', 'folicAcidUnit',
        'tshUnit', 'ft3Unit', 'ft4Unit',
      ];

      unitFields.forEach((field) => {
        const value = formData[field as keyof typeof formData] as string;
        if (value) {
          dataToSend[field] = value;
        }
      });

      if (labResultId) {
        await api.put(`/lab-results/${labResultId}`, dataToSend);
      } else {
        await api.post('/lab-results', dataToSend);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(`/patients/${id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Błąd zapisywania wyniku:', err);
      setError(err.response?.data?.error || err.message || 'Błąd zapisywania wyniku');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (labResultId && id) {
      fetchLabResult();
    }
  }, [labResultId, id]);

  const fetchLabResult = async () => {
    if (!labResultId) return;
    try {
      setLoadingData(true);
      const response = await api.get(`/lab-results/${labResultId}`);
      const result = response.data.labResult;
      
      setFormData({
        patientId: result.patientId || id || '',
        consultationId: result.consultationId || '',
        date: result.date ? new Date(result.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        hgb: result.hgb || '',
        hgbUnit: result.hgbUnit || 'g/dL',
        hgbRefLow: result.hgbRefLow || '',
        hgbRefHigh: result.hgbRefHigh || '',
        rbc: result.rbc || '',
        rbcUnit: result.rbcUnit || 'M/μL',
        rbcRefLow: result.rbcRefLow || '',
        rbcRefHigh: result.rbcRefHigh || '',
        wbc: result.wbc || '',
        wbcUnit: result.wbcUnit || 'K/μL',
        wbcRefLow: result.wbcRefLow || '',
        wbcRefHigh: result.wbcRefHigh || '',
        plt: result.plt || '',
        pltUnit: result.pltUnit || 'K/μL',
        pltRefLow: result.pltRefLow || '',
        pltRefHigh: result.pltRefHigh || '',
        ferritin: result.ferritin || '',
        ferritinUnit: result.ferritinUnit || 'ng/mL',
        ferritinRefLow: result.ferritinRefLow || '',
        ferritinRefHigh: result.ferritinRefHigh || '',
        iron: result.iron || '',
        ironUnit: result.ironUnit || 'μg/dL',
        ironRefLow: result.ironRefLow || '',
        ironRefHigh: result.ironRefHigh || '',
        vitaminD3: result.vitaminD3 || '',
        vitaminD3Unit: result.vitaminD3Unit || 'ng/mL',
        vitaminD3RefLow: result.vitaminD3RefLow || '',
        vitaminD3RefHigh: result.vitaminD3RefHigh || '',
        vitaminB12: result.vitaminB12 || '',
        vitaminB12Unit: result.vitaminB12Unit || 'pg/mL',
        vitaminB12RefLow: result.vitaminB12RefLow || '',
        vitaminB12RefHigh: result.vitaminB12RefHigh || '',
        folicAcid: result.folicAcid || '',
        folicAcidUnit: result.folicAcidUnit || 'ng/mL',
        folicAcidRefLow: result.folicAcidRefLow || '',
        folicAcidRefHigh: result.folicAcidRefHigh || '',
        tsh: result.tsh || '',
        tshUnit: result.tshUnit || 'mIU/L',
        tshRefLow: result.tshRefLow || '',
        tshRefHigh: result.tshRefHigh || '',
        ft3: result.ft3 || '',
        ft3Unit: result.ft3Unit || 'pg/mL',
        ft3RefLow: result.ft3RefLow || '',
        ft3RefHigh: result.ft3RefHigh || '',
        ft4: result.ft4 || '',
        ft4Unit: result.ft4Unit || 'ng/dL',
        ft4RefLow: result.ft4RefLow || '',
        ft4RefHigh: result.ft4RefHigh || '',
        notes: result.notes || '',
      });
    } catch (error: any) {
      console.error('Błąd pobierania wyniku:', error);
      setError(error.response?.data?.error || 'Błąd pobierania wyniku');
    } finally {
      setLoadingData(false);
    }
  };

  if (loadingData || (loading && !formData.patientId)) {
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
        {labResultId ? 'Edytuj wynik badania' : 'Dodaj wynik badania'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Wynik zapisany pomyślnie!
        </Alert>
      )}

      <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: { xs: 1.5, sm: 2 } }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data badania"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Morfologia
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="HGB"
                type="number"
                value={formData.hgb}
                onChange={(e) => handleChange('hgb', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Jednostka"
                value={formData.hgbUnit}
                onChange={(e) => handleChange('hgbUnit', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. dolna"
                type="number"
                value={formData.hgbRefLow}
                onChange={(e) => handleChange('hgbRefLow', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. górna"
                type="number"
                value={formData.hgbRefHigh}
                onChange={(e) => handleChange('hgbRefHigh', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Ferrytyna
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ferrytyna"
                type="number"
                value={formData.ferritin}
                onChange={(e) => handleChange('ferritin', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Jednostka"
                value={formData.ferritinUnit}
                onChange={(e) => handleChange('ferritinUnit', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. dolna"
                type="number"
                value={formData.ferritinRefLow}
                onChange={(e) => handleChange('ferritinRefLow', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. górna"
                type="number"
                value={formData.ferritinRefHigh}
                onChange={(e) => handleChange('ferritinRefHigh', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Witamina D3
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Witamina D3"
                type="number"
                value={formData.vitaminD3}
                onChange={(e) => handleChange('vitaminD3', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Jednostka"
                value={formData.vitaminD3Unit}
                onChange={(e) => handleChange('vitaminD3Unit', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. dolna"
                type="number"
                value={formData.vitaminD3RefLow}
                onChange={(e) => handleChange('vitaminD3RefLow', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. górna"
                type="number"
                value={formData.vitaminD3RefHigh}
                onChange={(e) => handleChange('vitaminD3RefHigh', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                TSH
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="TSH"
                type="number"
                value={formData.tsh}
                onChange={(e) => handleChange('tsh', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Jednostka"
                value={formData.tshUnit}
                onChange={(e) => handleChange('tshUnit', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. dolna"
                type="number"
                value={formData.tshRefLow}
                onChange={(e) => handleChange('tshRefLow', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Ref. górna"
                type="number"
                value={formData.tshRefHigh}
                onChange={(e) => handleChange('tshRefHigh', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Uwagi"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 1, sm: 2 }, 
                mt: { xs: 1.5, sm: 2 },
                flexDirection: { xs: 'column-reverse', sm: 'row' },
              }}>
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
                  {loading ? <CircularProgress size={24} /> : (isMobile ? 'Zapisz' : 'Zapisz wynik')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/patients/${id}`)}
                  fullWidth={isMobile}
                  size={isMobile ? 'medium' : 'large'}
                  sx={{ 
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    py: { xs: 1.25, sm: 1.5 },
                  }}
                >
                  Anuluj
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}

