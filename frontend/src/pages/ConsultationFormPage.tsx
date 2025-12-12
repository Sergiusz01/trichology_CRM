import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { ExpandMore, Save } from '@mui/icons-material';
import { api } from '../services/api';
import MultiSelectCheckboxes from '../components/MultiSelectCheckboxes';

export default function ConsultationFormPage() {
  const { id, patientId } = useParams<{ id?: string; patientId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Check if we're creating a new consultation by checking the URL path
  const isNewConsultation = location.pathname.includes('/consultations/new') || (!id && patientId);
  // If we're on /patients/:id/consultations/new, then id is actually the patientId
  const actualPatientId = location.pathname.includes('/consultations/new') ? id : (patientId || id);
  const actualConsultationId = location.pathname.includes('/consultations/new') ? undefined : id;
  
  const [formData, setFormData] = useState<any>({
    patientId: actualPatientId || '',
    consultationDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Only fetch consultation if we're editing an existing one (not creating new)
    if (actualConsultationId && !isNewConsultation) {
      fetchConsultation();
    } else if (actualPatientId) {
      // When creating new consultation, ensure patientId is set
      setFormData((prev: any) => ({
        ...prev,
        patientId: actualPatientId,
      }));
    }
  }, [actualConsultationId, actualPatientId, isNewConsultation]);

  const fetchConsultation = async () => {
    // Don't fetch if we're creating a new consultation
    if (!actualConsultationId || isNewConsultation) {
      console.log('[ConsultationFormPage] Skipping fetch - creating new consultation');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      console.log('[ConsultationFormPage] Fetching consultation with ID:', actualConsultationId);
      
      const response = await api.get(`/consultations/${actualConsultationId}`);
      console.log('[ConsultationFormPage] Consultation response:', response.data);
      
      const consultation = response.data.consultation;
      
      if (!consultation) {
        console.error('[ConsultationFormPage] No consultation in response');
        setError('Konsultacja nie znaleziona');
        setLoading(false);
        return;
      }
      // Parse JSON fields back to arrays
      const jsonFields = [
        'hairLossLocalization',
        'scalingType',
        'sensitivityProblemType',
        'scalpType',
        'scalpAppearance',
        'skinLesions',
        'seborrheaType',
        'dandruffType',
        'hairDamage',
        'hairDamageReason',
        'hairTypes',
        'vellusMiniaturizedHairs',
        'vascularPatterns',
        'perifollicularFeatures',
        'scalpDiseases',
        'otherDiagnostics',
        'alopeciaTypes',
        'alopeciaAffectedAreas',
      ];
      const parsedData: any = {
        ...consultation,
        consultationDate: new Date(consultation.consultationDate).toISOString().split('T')[0],
        patientId: consultation.patientId,
      };
      jsonFields.forEach((field) => {
        if (parsedData[field]) {
          try {
            parsedData[field] = typeof parsedData[field] === 'string' 
              ? JSON.parse(parsedData[field]) 
              : parsedData[field];
          } catch {
            parsedData[field] = [];
          }
        }
      });
      setFormData(parsedData);
    } catch (error: any) {
      console.error('[ConsultationFormPage] Błąd pobierania konsultacji:', error);
      console.error('[ConsultationFormPage] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      
      // Only show error if we're actually trying to edit an existing consultation
      // (not when creating a new one)
      if (error.response?.status === 404 && actualConsultationId && !isNewConsultation) {
        setError('Konsultacja nie znaleziona. Może została usunięta.');
        // Redirect back to patient page after showing error
        setTimeout(() => {
          if (formData.patientId || actualPatientId) {
            navigate(`/patients/${formData.patientId || actualPatientId}`);
          } else {
            navigate('/patients');
          }
        }, 3000);
      } else if (error.response?.status === 401) {
        setError('Brak autoryzacji. Zaloguj się ponownie.');
      } else if (actualConsultationId && !isNewConsultation) {
        // Only show error if we're editing, not creating
        setError(error.response?.data?.error || error.message || 'Błąd pobierania konsultacji');
      }
      // Don't show error if we're creating a new consultation
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: string, value: string[]) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const getArrayValue = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Convert arrays to JSON strings for fields that should be JSON
    const jsonFields = [
      'hairLossLocalization',
      'scalingType',
      'sensitivityProblemType',
      'scalpType',
      'scalpAppearance',
      'skinLesions',
      'seborrheaType',
      'dandruffType',
      'hairDamage',
      'hairDamageReason',
      'hairTypes',
      'vellusMiniaturizedHairs',
      'vascularPatterns',
      'perifollicularFeatures',
      'scalpDiseases',
      'otherDiagnostics',
      'alopeciaTypes',
      'alopeciaAffectedAreas',
    ];
    
    const dataToSend: any = {};
    
    // Copy only defined fields and handle conversions
    Object.keys(formData).forEach((key) => {
      const value = formData[key];
      
      // Skip undefined, null, or empty strings (except for required fields)
      if (value === undefined || value === null || value === '') {
        // Only include empty strings for required fields (patientId, consultationDate)
        if (key === 'patientId' || key === 'consultationDate') {
          if (value !== undefined && value !== null) {
            dataToSend[key] = value;
          }
        }
        // Skip other empty values
        return;
      }
      
      // Handle JSON fields - convert arrays to JSON strings
      if (jsonFields.includes(key)) {
        if (Array.isArray(value)) {
          // Convert array to JSON string for transmission
          dataToSend[key] = value.length > 0 ? JSON.stringify(value) : undefined;
        } else if (typeof value === 'string') {
          // If it's already a string, try to parse it first to validate
          try {
            const parsed = JSON.parse(value);
            dataToSend[key] = Array.isArray(parsed) && parsed.length > 0 ? value : undefined;
          } catch {
            // If it's not valid JSON, skip it
            dataToSend[key] = undefined;
          }
        }
      } else {
        // Regular fields - include as is
        dataToSend[key] = value;
      }
    });
    
    // Remove undefined values
    Object.keys(dataToSend).forEach((key) => {
      if (dataToSend[key] === undefined) {
        delete dataToSend[key];
      }
    });
    
    console.log('[ConsultationFormPage] Data to send keys:', Object.keys(dataToSend));
    console.log('[ConsultationFormPage] PatientId:', dataToSend.patientId);

    try {
      if (actualConsultationId && !isNewConsultation) {
        await api.put(`/consultations/${actualConsultationId}`, dataToSend);
      } else {
        await api.post('/consultations', dataToSend);
      }
      setSuccess(true);
      setTimeout(() => {
        navigate(`/patients/${formData.patientId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Błąd zapisywania konsultacji:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error message:', err.message);
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Show detailed error message
        let errorMessage = errorData.error || 'Błąd zapisywania konsultacji';
        
        if (errorData.message) {
          errorMessage += `: ${errorData.message}`;
        }
        
        if (errorData.details) {
          if (Array.isArray(errorData.details)) {
            // Validation errors
            const validationErrors = errorData.details
              .map((e: any) => `${e.path?.join('.') || e.field || 'unknown'}: ${e.message || e}`)
              .join(', ');
            errorMessage = `Błąd walidacji: ${validationErrors}`;
          } else if (errorData.details.field) {
            // Prisma error with field details
            errorMessage += ` (Pole: ${errorData.details.field})`;
          } else {
            // Other details
            errorMessage += ` (${JSON.stringify(errorData.details)})`;
          }
        }
        
        setError(errorMessage);
      } else {
        setError(err.message || 'Błąd zapisywania konsultacji');
      }
    } finally {
      setLoading(false);
    }
  };

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
        {isNewConsultation ? 'Nowa konsultacja' : 'Edycja konsultacji'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Konsultacja zapisana pomyślnie!
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: { xs: 1.5, sm: 2 } }}>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data konsultacji"
                type="date"
                value={formData.consultationDate}
                onChange={(e) => handleChange('consultationDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Hair Loss Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">1. Wypadanie włosów</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Nasilenie</InputLabel>
                  <Select
                    value={formData.hairLossSeverity || ''}
                    onChange={(e) => handleChange('hairLossSeverity', e.target.value)}
                    label="Nasilenie"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="normie">W normie</MenuItem>
                    <MenuItem value="nasilone">Nasilone</MenuItem>
                    <MenuItem value="nadmierne">Nadmierne</MenuItem>
                    <MenuItem value="okresowe">Okresowe</MenuItem>
                    <MenuItem value="brak">Brak</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czas trwania</InputLabel>
                  <Select
                    value={formData.hairLossDuration || ''}
                    onChange={(e) => handleChange('hairLossDuration', e.target.value)}
                    label="Czas trwania"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="0-6 m-cy">0-6 m-cy</MenuItem>
                    <MenuItem value="6-12 m-cy">6-12 m-cy</MenuItem>
                    <MenuItem value="12-24 m-cy">12-24 m-cy</MenuItem>
                    <MenuItem value="powyżej roku">Powyżej roku</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Lokalizacja"
                  options={[
                    'ciemieniowa',
                    'skronie',
                    'czołowa',
                    'tonsura',
                    'potylica',
                    'uogólnione',
                    'brwi, rzęsy',
                    'pachy',
                    'pachwiny',
                  ]}
                  value={getArrayValue(formData.hairLossLocalization)}
                  onChange={(value) => handleArrayChange('hairLossLocalization', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Używane szampony"
                  value={formData.hairLossShampoos || ''}
                  onChange={(e) => handleChange('hairLossShampoos', e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Oily Hair Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">2. Przetłuszczanie się włosów</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Nasilenie</InputLabel>
                  <Select
                    value={formData.oilyHairSeverity || ''}
                    onChange={(e) => handleChange('oilyHairSeverity', e.target.value)}
                    label="Nasilenie"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="normie">W normie</MenuItem>
                    <MenuItem value="nasilone">Nasilone</MenuItem>
                    <MenuItem value="nadmierne">Nadmierne</MenuItem>
                    <MenuItem value="okresowe">Okresowe</MenuItem>
                    <MenuItem value="brak">Brak</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Częstotliwość mycia</InputLabel>
                  <Select
                    value={formData.oilyHairWashingFreq || ''}
                    onChange={(e) => handleChange('oilyHairWashingFreq', e.target.value)}
                    label="Częstotliwość mycia"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="codziennie">Codziennie</MenuItem>
                    <MenuItem value="co 2,3 dni">Co 2,3 dni</MenuItem>
                    <MenuItem value="raz w tygodniu">Raz w tygodniu</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czas trwania</InputLabel>
                  <Select
                    value={formData.oilyHairDuration || ''}
                    onChange={(e) => handleChange('oilyHairDuration', e.target.value)}
                    label="Czas trwania"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="0-6 m-cy">0-6 m-cy</MenuItem>
                    <MenuItem value="6-12 m-cy">6-12 m-cy</MenuItem>
                    <MenuItem value="12-24 m-cy">12-24 m-cy</MenuItem>
                    <MenuItem value="powyżej roku">Powyżej roku</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Używane szampony"
                  value={formData.oilyHairShampoos || ''}
                  onChange={(e) => handleChange('oilyHairShampoos', e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Scaling Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">3. Łuszczenie skóry głowy</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Nasilenie</InputLabel>
                  <Select
                    value={formData.scalingSeverity || ''}
                    onChange={(e) => handleChange('scalingSeverity', e.target.value)}
                    label="Nasilenie"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="normie">W normie</MenuItem>
                    <MenuItem value="nasilone">Nasilone</MenuItem>
                    <MenuItem value="nadmierne">Nadmierne</MenuItem>
                    <MenuItem value="okresowe">Okresowe</MenuItem>
                    <MenuItem value="brak">Brak</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czas trwania</InputLabel>
                  <Select
                    value={formData.scalingDuration || ''}
                    onChange={(e) => handleChange('scalingDuration', e.target.value)}
                    label="Czas trwania"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="0-6 m-cy">0-6 m-cy</MenuItem>
                    <MenuItem value="6-12 m-cy">6-12 m-cy</MenuItem>
                    <MenuItem value="12-24 m-cy">12-24 m-cy</MenuItem>
                    <MenuItem value="powyżej roku">Powyżej roku</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Rodzaj"
                  options={['suchy', 'tłusty', 'miejscowy', 'uogólniony']}
                  value={getArrayValue(formData.scalingType)}
                  onChange={(value) => handleArrayChange('scalingType', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Inne"
                  value={formData.scalingOther || ''}
                  onChange={(e) => handleChange('scalingOther', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Scalp Sensitivity Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">4. Wrażliwość skóry głowy</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Nasilenie</InputLabel>
                  <Select
                    value={formData.sensitivitySeverity || ''}
                    onChange={(e) => handleChange('sensitivitySeverity', e.target.value)}
                    label="Nasilenie"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="normie">W normie</MenuItem>
                    <MenuItem value="nasilone">Nasilone</MenuItem>
                    <MenuItem value="nadmierne">Nadmierne</MenuItem>
                    <MenuItem value="okresowe">Okresowe</MenuItem>
                    <MenuItem value="brak">Brak</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czas trwania</InputLabel>
                  <Select
                    value={formData.sensitivityDuration || ''}
                    onChange={(e) => handleChange('sensitivityDuration', e.target.value)}
                    label="Czas trwania"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="0-6 m-cy">0-6 m-cy</MenuItem>
                    <MenuItem value="6-12 m-cy">6-12 m-cy</MenuItem>
                    <MenuItem value="12-24 m-cy">12-24 m-cy</MenuItem>
                    <MenuItem value="powyżej roku">Powyżej roku</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Rodzaj problemu"
                  options={['świąd', 'pieczenie', 'nadwrażliwość na preparaty', 'trichodynia']}
                  value={getArrayValue(formData.sensitivityProblemType)}
                  onChange={(value) => handleArrayChange('sensitivityProblemType', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Inne"
                  value={formData.sensitivityOther || ''}
                  onChange={(e) => handleChange('sensitivityOther', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Inflammatory States */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">5. Stany zapalne / Grudki</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Stany zapalne / Grudki"
                  value={formData.inflammatoryStates || ''}
                  onChange={(e) => handleChange('inflammatoryStates', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Interview/Anamnesis Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">6. Wywiad</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy problem występuje u innych członków rodziny?</InputLabel>
                  <Select
                    value={formData.familyHistory || ''}
                    onChange={(e) => handleChange('familyHistory', e.target.value)}
                    label="Czy problem występuje u innych członków rodziny?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy była konieczna wizyta u dermatologa?</InputLabel>
                  <Select
                    value={formData.dermatologyVisits || ''}
                    onChange={(e) => handleChange('dermatologyVisits', e.target.value)}
                    label="Czy była konieczna wizyta u dermatologa?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.dermatologyVisits === 'tak' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Powód wizyty u dermatologa"
                    value={formData.dermatologyVisitsReason || ''}
                    onChange={(e) => handleChange('dermatologyVisitsReason', e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy jest Pani w ciąży?</InputLabel>
                  <Select
                    value={formData.pregnancy || ''}
                    onChange={(e) => handleChange('pregnancy', e.target.value)}
                    label="Czy jest Pani w ciąży?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy miesiączkuje regularnie?</InputLabel>
                  <Select
                    value={formData.menstruationRegularity || ''}
                    onChange={(e) => handleChange('menstruationRegularity', e.target.value)}
                    label="Czy miesiączkuje regularnie?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Antykoncepcja hormonalna"
                  value={formData.contraception || ''}
                  onChange={(e) => handleChange('contraception', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy zażywa Pan/Pani jakieś leki?</InputLabel>
                  <Select
                    value={formData.medications || ''}
                    onChange={(e) => handleChange('medications', e.target.value)}
                    label="Czy zażywa Pan/Pani jakieś leki?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.medications === 'tak' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Jakie leki"
                    value={formData.medicationsList || ''}
                    onChange={(e) => handleChange('medicationsList', e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Czy stosuje Pani/Pan suplementy?"
                  value={formData.supplements || ''}
                  onChange={(e) => handleChange('supplements', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Poziom stresu w życiu codziennym</InputLabel>
                  <Select
                    value={formData.stressLevel || ''}
                    onChange={(e) => handleChange('stressLevel', e.target.value)}
                    label="Poziom stresu w życiu codziennym"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="duży">Duży</MenuItem>
                    <MenuItem value="mały">Mały</MenuItem>
                    <MenuItem value="średni">Średni</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy w ostatnim czasie była Pani/Pan poddana narkozie?</InputLabel>
                  <Select
                    value={formData.anesthesia || ''}
                    onChange={(e) => handleChange('anesthesia', e.target.value)}
                    label="Czy w ostatnim czasie była Pani/Pan poddana narkozie?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy w ostatnim czasie była Pani/Pan poddana chemioterapii?</InputLabel>
                  <Select
                    value={formData.chemotherapy || ''}
                    onChange={(e) => handleChange('chemotherapy', e.target.value)}
                    label="Czy w ostatnim czasie była Pani/Pan poddana chemioterapii?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy w ostatnim czasie była Pani/Pan poddana radioterapii?</InputLabel>
                  <Select
                    value={formData.radiotherapy || ''}
                    onChange={(e) => handleChange('radiotherapy', e.target.value)}
                    label="Czy w ostatnim czasie była Pani/Pan poddana radioterapii?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy w ostatnim czasie była Pani/Pan poddana szczepieniu?</InputLabel>
                  <Select
                    value={formData.vaccination || ''}
                    onChange={(e) => handleChange('vaccination', e.target.value)}
                    label="Czy w ostatnim czasie była Pani/Pan poddana szczepieniu?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Antybiotyki"
                  value={formData.antibiotics || ''}
                  onChange={(e) => handleChange('antibiotics', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy choruje Pani/Pan na choroby przewlekłe?</InputLabel>
                  <Select
                    value={formData.chronicDiseases || ''}
                    onChange={(e) => handleChange('chronicDiseases', e.target.value)}
                    label="Czy choruje Pani/Pan na choroby przewlekłe?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.chronicDiseases === 'tak' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Jakie choroby"
                    value={formData.chronicDiseasesList || ''}
                    onChange={(e) => handleChange('chronicDiseasesList', e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy jest Pani/Pan pod opieką specjalisty?</InputLabel>
                  <Select
                    value={formData.specialists || ''}
                    onChange={(e) => handleChange('specialists', e.target.value)}
                    label="Czy jest Pani/Pan pod opieką specjalisty?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.specialists === 'tak' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Jakiego specjalisty"
                    value={formData.specialistsList || ''}
                    onChange={(e) => handleChange('specialistsList', e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy występują u Pani/Pana zaburzenia odżywiania/wchłaniania?</InputLabel>
                  <Select
                    value={formData.eatingDisorders || ''}
                    onChange={(e) => handleChange('eatingDisorders', e.target.value)}
                    label="Czy występują u Pani/Pana zaburzenia odżywiania/wchłaniania?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Nietolerancje pokarmowe"
                  value={formData.foodIntolerances || ''}
                  onChange={(e) => handleChange('foodIntolerances', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy w ostatnim czasie była Pani/Pan na diecie?</InputLabel>
                  <Select
                    value={formData.diet || ''}
                    onChange={(e) => handleChange('diet', e.target.value)}
                    label="Czy w ostatnim czasie była Pani/Pan na diecie?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy występuje u Pani/Pana alergia lub uczulenie?</InputLabel>
                  <Select
                    value={formData.allergies || ''}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                    label="Czy występuje u Pani/Pana alergia lub uczulenie?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Czy ma Pani/Pan jakieś części metalowe w organizmie?</InputLabel>
                  <Select
                    value={formData.metalPartsInBody || ''}
                    onChange={(e) => handleChange('metalPartsInBody', e.target.value)}
                    label="Czy ma Pani/Pan jakieś części metalowe w organizmie?"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="tak">Tak</MenuItem>
                    <MenuItem value="nie">Nie</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Rutyna pielęgnacyjna:</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Szampon"
                  value={formData.careRoutineShampoo || ''}
                  onChange={(e) => handleChange('careRoutineShampoo', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Odżywka/Maska"
                  value={formData.careRoutineConditioner || ''}
                  onChange={(e) => handleChange('careRoutineConditioner', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Oleje/Lotiony"
                  value={formData.careRoutineOils || ''}
                  onChange={(e) => handleChange('careRoutineOils', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Zabiegi chemiczne/Termiczne"
                  value={formData.careRoutineChemical || ''}
                  onChange={(e) => handleChange('careRoutineChemical', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Trichoscopy Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">7. Trichoskopia</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Typ skóry głowy"
                  options={['sucha', 'tłusta', 'wrażliwa', 'nadreaktywna', 'z erytrodermią', 'normalna']}
                  value={getArrayValue(formData.scalpType)}
                  onChange={(value) => handleArrayChange('scalpType', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Wygląd i objawy na skórze"
                  options={['zaczerwienie', 'świąd', 'pieczenie', 'ból', 'suchość', 'łojotok']}
                  value={getArrayValue(formData.scalpAppearance)}
                  onChange={(value) => handleArrayChange('scalpAppearance', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Wykwity skórne"
                  options={[
                    'plama',
                    'grudka',
                    'krosta',
                    'guzek',
                    'blizna',
                    'strup',
                    'pęknięcie',
                    'łuska',
                    'przeczos',
                    'złuszczanie płatowe',
                    'złuszczanie otrębiaste',
                    'obj. Kebnera',
                  ]}
                  value={getArrayValue(formData.skinLesions)}
                  onChange={(value) => handleArrayChange('skinLesions', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Hiperhydroza</InputLabel>
                  <Select
                    value={formData.hyperhidrosis || ''}
                    onChange={(e) => handleChange('hyperhidrosis', e.target.value)}
                    label="Hiperhydroza"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="miejscowa">Miejscowa</MenuItem>
                    <MenuItem value="uogólniona">Uogólniona</MenuItem>
                    <MenuItem value="brak">Brak</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Hiperkeratynizacja</InputLabel>
                  <Select
                    value={formData.hyperkeratinization || ''}
                    onChange={(e) => handleChange('hyperkeratinization', e.target.value)}
                    label="Hiperkeratynizacja"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="miejscowa">Miejscowa</MenuItem>
                    <MenuItem value="uogólniona">Uogólniona</MenuItem>
                    <MenuItem value="okołomieszkowa">Okołomieszkowa</MenuItem>
                    <MenuItem value="tubule">Tubule</MenuItem>
                    <MenuItem value="brak">Brak</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Wydzielina gruczołów łojowych</InputLabel>
                  <Select
                    value={formData.sebaceousSecretion || ''}
                    onChange={(e) => handleChange('sebaceousSecretion', e.target.value)}
                    label="Wydzielina gruczołów łojowych"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="oleista">Oleista</MenuItem>
                    <MenuItem value="zalegająca">Zalegająca</MenuItem>
                    <MenuItem value="brak">Brak</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Interpretacja rodzaju łojotoku"
                  options={[
                    'Skóra sucha odwodniona/Cebulka tłusta',
                    'Skóra tłusta/Cebulka tłusta',
                    'Hiperhydroza/Cebulka tłusta',
                    'Skóra tłusta/Cebulka dystroficzna',
                    'Łojotok/Wypadanie włosów',
                  ]}
                  value={getArrayValue(formData.seborrheaType)}
                  onChange={(value) => handleArrayChange('seborrheaType', value)}
                />
              </Grid>
              {getArrayValue(formData.seborrheaType).some((v: string) => v.includes('Inne')) && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Inne (interpretacja rodzaju łojotoku)"
                    value={formData.seborrheaTypeOther || ''}
                    onChange={(e) => handleChange('seborrheaTypeOther', e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Łupież"
                  options={['Suchy', 'Tłusty', 'Kosmetyczny', 'miejscowy', 'uogólniony']}
                  value={getArrayValue(formData.dandruffType)}
                  onChange={(value) => handleArrayChange('dandruffType', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Wartość pH"
                  value={formData.scalpPH || ''}
                  onChange={(e) => handleChange('scalpPH', e.target.value)}
                  inputProps={{ step: '0.1', min: '0', max: '14' }}
                />
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Uszkodzenia włosa"
                  options={['naturalne', 'fizyczne', 'mechaniczne', 'chemiczne']}
                  value={getArrayValue(formData.hairDamage)}
                  onChange={(value) => handleArrayChange('hairDamage', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Powody uszkodzenia"
                  options={[
                    'trwała',
                    'trwałe prostowanie',
                    'farby/rozjaśnianie',
                    'lakier do włosów',
                    'produkty do stylizacji',
                    'prostownica/lokówka',
                  ]}
                  value={getArrayValue(formData.hairDamageReason)}
                  onChange={(value) => handleArrayChange('hairDamageReason', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Jakość włosa</InputLabel>
                  <Select
                    value={formData.hairQuality || ''}
                    onChange={(e) => handleChange('hairQuality', e.target.value)}
                    label="Jakość włosa"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="zdrowe">Zdrowe</MenuItem>
                    <MenuItem value="suche">Suche</MenuItem>
                    <MenuItem value="przetłuszczone">Przetłuszczone</MenuItem>
                    <MenuItem value="zniszczona łuska włosa">Zniszczona łuska włosa</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Kształt włosa</InputLabel>
                  <Select
                    value={formData.hairShape || ''}
                    onChange={(e) => handleChange('hairShape', e.target.value)}
                    label="Kształt włosa"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="prosty">Prosty</MenuItem>
                    <MenuItem value="kręcony">Kręcony</MenuItem>
                    <MenuItem value="falisty">Falisty</MenuItem>
                    <MenuItem value="fil-fil">Fil-fil</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Rodzaje włosów"
                  options={['urwane', 'kręte', 'paciorkowate', 'obrączkowate', 'tulipanowe', 'wykrzyknikowe']}
                  value={getArrayValue(formData.hairTypes)}
                  onChange={(value) => handleArrayChange('hairTypes', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Włosy następowe</InputLabel>
                  <Select
                    value={formData.regrowingHairs || ''}
                    onChange={(e) => handleChange('regrowingHairs', e.target.value)}
                    label="Włosy następowe"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="dużo">Dużo</MenuItem>
                    <MenuItem value="niewiele">Niewiele</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Włosy vellus/zminiaturyzowane"
                  options={['dużo', 'mało', 'uogólnione', 'miejscowo', 'brak']}
                  value={getArrayValue(formData.vellusMiniaturizedHairs)}
                  onChange={(value) => handleArrayChange('vellusMiniaturizedHairs', value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Diagnostics Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">8. Diagnostyka</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Unaczynienie"
                  options={[
                    'naczynia proste',
                    'naczynia poskręcane',
                    'naczynia drzewkowate',
                    'wzorzec plastra miodu',
                    'typ spinek',
                    'okołomieszkowe',
                    'miejscowe',
                    'rozlane',
                  ]}
                  value={getArrayValue(formData.vascularPatterns)}
                  onChange={(value) => handleArrayChange('vascularPatterns', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Cechy okołomieszkowe"
                  options={['white dots', 'yellow dots', 'black dots', 'prawidłowe']}
                  value={getArrayValue(formData.perifollicularFeatures)}
                  onChange={(value) => handleArrayChange('perifollicularFeatures', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Choroby skóry głowy"
                  options={['ŁZS', 'LLP', 'AZS', 'grzybica', 'łuszczyca', 'zapalenia okołomieszkowe']}
                  value={getArrayValue(formData.scalpDiseases)}
                  onChange={(value) => handleArrayChange('scalpDiseases', value)}
                />
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Inne"
                  options={['trychodynia', 'plaster miodu', 'cofnięcie linii czołowej', 'trichokinesis']}
                  value={getArrayValue(formData.otherDiagnostics)}
                  onChange={(value) => handleArrayChange('otherDiagnostics', value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Alopecia Diagnostics Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">9. Diagnostyka łysienia</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Łysienie"
                  options={[
                    'androgenetic alopecia MAGA/AG',
                    'telogen efluvium TE',
                    'anagen efluvium AE',
                    'Alopecia aerata AA',
                    'folicularis decalvans/bliznowaciejące FD',
                    'trichotillomania TTM',
                    'trichodynia',
                    'Idiopatyczne skrócenie anagenu',
                    'łysienie starcze',
                  ]}
                  value={getArrayValue(formData.alopeciaTypes)}
                  onChange={(value) => handleArrayChange('alopeciaTypes', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Stopień przerzedzenia</InputLabel>
                  <Select
                    value={formData.degreeOfThinning || ''}
                    onChange={(e) => handleChange('degreeOfThinning', e.target.value)}
                    label="Stopień przerzedzenia"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="zanik">Zanik</MenuItem>
                    <MenuItem value="mało">Mało</MenuItem>
                    <MenuItem value="miejscowo">Miejscowo</MenuItem>
                    <MenuItem value="dużo">Dużo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Typ łysienia</InputLabel>
                  <Select
                    value={formData.alopeciaType || ''}
                    onChange={(e) => handleChange('alopeciaType', e.target.value)}
                    label="Typ łysienia"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="Androgenowe typu męskiego">Androgenowe typu męskiego</MenuItem>
                    <MenuItem value="Androgenowe typu żeńskiego">Androgenowe typu żeńskiego</MenuItem>
                    <MenuItem value="Plackowate AA">Plackowate AA</MenuItem>
                    <MenuItem value="Telogenowe TE">Telogenowe TE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <MultiSelectCheckboxes
                  label="Obszar wypadanie włosów"
                  options={['Hormonozależny', 'Tył głowy', 'Cały obszar głowy', 'Inne']}
                  value={getArrayValue(formData.alopeciaAffectedAreas)}
                  onChange={(value) => handleArrayChange('alopeciaAffectedAreas', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Cechy miniaturyzacji mieszków</InputLabel>
                  <Select
                    value={formData.miniaturization || ''}
                    onChange={(e) => handleChange('miniaturization', e.target.value)}
                    label="Cechy miniaturyzacji mieszków"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="Występują">Występują</MenuItem>
                    <MenuItem value="Nie występują">Nie występują</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Zespoły mieszkowe</InputLabel>
                  <Select
                    value={formData.follicularUnits || ''}
                    onChange={(e) => handleChange('follicularUnits', e.target.value)}
                    label="Zespoły mieszkowe"
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="Przewaga pojedynczych">Przewaga pojedynczych</MenuItem>
                    <MenuItem value="Przewaga podwójnych">Przewaga podwójnych</MenuItem>
                    <MenuItem value="Przewaga potrójnych/poczwórnych">Przewaga potrójnych/poczwórnych</MenuItem>
                    <MenuItem value="Występują puste mieszki włosowe">Występują puste mieszki włosowe</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>"PULL TEST"</InputLabel>
                  <Select
                    value={formData.pullTest || ''}
                    onChange={(e) => handleChange('pullTest', e.target.value)}
                    label='"PULL TEST"'
                  >
                    <MenuItem value="">Brak</MenuItem>
                    <MenuItem value="dodatni TE/AE">Dodatni TE/AE</MenuItem>
                    <MenuItem value="ujemny AGA">Ujemny AGA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Inne"
                  value={formData.alopeciaOther || ''}
                  onChange={(e) => handleChange('alopeciaOther', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Diagnosis Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">10. Rozpoznanie</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Rozpoznanie"
              value={formData.diagnosis || ''}
              onChange={(e) => handleChange('diagnosis', e.target.value)}
            />
          </AccordionDetails>
        </Accordion>

        {/* Care Recommendations */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">11. Zalecenia</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Preparaty do mycia"
                  value={formData.careRecommendationsWashing || ''}
                  onChange={(e) => handleChange('careRecommendationsWashing', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Preparaty do wcierania"
                  value={formData.careRecommendationsTopical || ''}
                  onChange={(e) => handleChange('careRecommendationsTopical', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Suplementacja"
                  value={formData.careRecommendationsSupplement || ''}
                  onChange={(e) => handleChange('careRecommendationsSupplement', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Zmiany w pielęgnacji"
                  value={formData.careRecommendationsBehavior || ''}
                  onChange={(e) => handleChange('careRecommendationsBehavior', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Visits/Procedures */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">12. Wizyty / Zabiegi</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notatki z wizyt i zabiegów"
              value={formData.visitsProcedures || ''}
              onChange={(e) => handleChange('visitsProcedures', e.target.value)}
            />
          </AccordionDetails>
        </Accordion>

        {/* Scales Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">13. Skale Norwood-Hamilton i Ludwig</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Stopień Norwood-Hamilton"
                  value={formData.norwoodHamiltonStage || ''}
                  onChange={(e) => handleChange('norwoodHamiltonStage', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Uwagi Norwood-Hamilton"
                  value={formData.norwoodHamiltonNotes || ''}
                  onChange={(e) => handleChange('norwoodHamiltonNotes', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Stopień Ludwig"
                  value={formData.ludwigStage || ''}
                  onChange={(e) => handleChange('ludwigStage', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Uwagi Ludwig"
                  value={formData.ludwigNotes || ''}
                  onChange={(e) => handleChange('ludwigNotes', e.target.value)}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* General Remarks */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">14. Uwagi ogólne</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Uwagi"
              value={formData.generalRemarks || ''}
              onChange={(e) => handleChange('generalRemarks', e.target.value)}
            />
          </AccordionDetails>
        </Accordion>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
            startIcon={<Save />}
            disabled={loading}
          >
            {loading ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}


