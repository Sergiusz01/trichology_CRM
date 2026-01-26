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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Cancel,
  Science,
  Bloodtype,
  Opacity,
  Assignment,
  MonitorHeart,
  CalendarMonth
} from '@mui/icons-material';
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
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
          fontWeight: 700,
          mb: 4,
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Science fontSize="large" />
        {labResultId ? 'Edytuj wynik badania' : 'Nowy wynik badania'}
      </Typography>

      {
        error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )
      }

      {
        success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            Wynik zapisany pomyślnie!
          </Alert>
        )
      }

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, overflow: 'hidden', elevation: 2 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label="Data badania"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Categories */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Morfologia */}
          <Accordion defaultExpanded sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Bloodtype color="error" />
                <Typography variant="h6" fontWeight={600}>Morfologia</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={3}>
                {/* HGB Row */}
                {renderLabRow('HGB', 'hgb')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {/* RBC Row */}
                {renderLabRow('RBC', 'rbc')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {/* WBC Row */}
                {renderLabRow('WBC', 'wbc')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {/* PLT Row */}
                {renderLabRow('PLT', 'plt')}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Żelazo / Ferrytyna */}
          <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Opacity color="error" />
                <Typography variant="h6" fontWeight={600}>Gospodarka żelazowa</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={3}>
                {renderLabRow('Ferrytyna', 'ferritin')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {renderLabRow('Żelazo', 'iron')}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Witaminy */}
          <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <MonitorHeart color="primary" />
                <Typography variant="h6" fontWeight={600}>Witaminy</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={3}>
                {renderLabRow('Witamina D3', 'vitaminD3')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {renderLabRow('Witamina B12', 'vitaminB12')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {renderLabRow('Kwas foliowy', 'folicAcid')}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Tarczyca */}
          <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Assignment color="info" />
                <Typography variant="h6" fontWeight={600}>Tarczyca</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={3}>
                {renderLabRow('TSH', 'tsh')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {renderLabRow('FT3', 'ft3')}
                <Grid size={{ xs: 12 }}><Divider sx={{ my: 1, opacity: 0.6 }} /></Grid>
                {renderLabRow('FT4', 'ft4')}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Uwagi */}
          <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mt: 1, boxShadow: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment fontSize="small" color="action" />
              Notatki i uwagi dodatkowe
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Wpisz wszelkie dodatkowe informacje o wynikach lub samopoczuciu pacjenta..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              sx={{ mt: 1 }}
            />
          </Paper>
        </Box>

        {/* Actions */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          mt: 4,
          mb: 4,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'flex-end'
        }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/patients/${id}`)}
            fullWidth={isMobile}
            disabled={loading}
            startIcon={<Cancel />}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600
            }}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth={isMobile}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: 3
            }}
          >
            {loading ? 'Zapisywanie...' : (labResultId ? 'Zaktualizuj wynik' : 'Zapisz wynik')}
          </Button>
        </Box>
      </form>
    </Box>
  );

  // Helper function to render a lab row
  function renderLabRow(label: string, field: string) {
    const unitField = `${field}Unit` as keyof typeof formData;
    const refLowField = `${field}RefLow` as keyof typeof formData;
    const refHighField = `${field}RefHigh` as keyof typeof formData;

    return (
      <Grid container spacing={2} size={{ xs: 12 }} alignItems="center">
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
            {label}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <TextField
            fullWidth
            label="Wynik"
            type="number"
            size="small"
            value={formData[field as keyof typeof formData]}
            onChange={(e) => handleChange(field, e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <TextField
            fullWidth
            label="Jedn."
            size="small"
            value={formData[unitField]}
            onChange={(e) => handleChange(unitField, e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2, md: 2 }}>
          <TextField
            fullWidth
            label="Ref. dół"
            type="number"
            size="small"
            value={formData[refLowField]}
            onChange={(e) => handleChange(refLowField, e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 2, md: 2 }}>
          <TextField
            fullWidth
            label="Ref. góra"
            type="number"
            size="small"
            value={formData[refHighField]}
            onChange={(e) => handleChange(refHighField, e.target.value)}
          />
        </Grid>
      </Grid>
    );
  }
}

