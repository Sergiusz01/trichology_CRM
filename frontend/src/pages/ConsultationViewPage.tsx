import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Grid,
  Chip,
  useMediaQuery,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Edit, GetApp, ArrowBack, ContentCopy } from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { FIELD_LABELS } from '../shared/consultationFields';

// Helper function to format JSON fields (arrays)
const formatJsonField = (value: any): string => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
      return value;
    } catch {
      return value;
    }
  }
  return String(value);
};

// Helper function to format date
const formatDate = (date: Date | string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Helper function to format date and time
const formatDateTime = (date: Date | string): string => {
  return new Date(date).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Render checkbox-like info
const renderCheckboxInfo = (label: string, value: any) => {
  if (!value) return null;
  const displayValue = typeof value === 'boolean' ? (value ? 'TAK' : 'NIE') : formatJsonField(value);
  return (
    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
      <Box component="span" sx={{ mr: 1, fontSize: '0.75rem', color: '#333' }}>■</Box>
      <Typography component="span" sx={{
        fontWeight: 'bold',
        mr: 1,
        minWidth: { xs: '100px', sm: '120px' },
        fontSize: { xs: '0.75rem', sm: '0.875rem' },
      }}>
        {label}:
      </Typography>
      <Typography component="span" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
        {displayValue}
      </Typography>
    </Box>
  );
};

// Render field row
const renderFieldRow = (label: string, value: any) => {
  if (!value) return null;
  return (
    <Box sx={{
      display: 'flex',
      borderBottom: '1px dotted #ccc',
      pb: 0.5,
      mb: 0.5,
      fontSize: '0.875rem'
    }}>
      <Typography component="span" sx={{ fontWeight: 'bold', mr: 1, minWidth: '120px' }}>
        {label}:
      </Typography>
      <Typography component="span" sx={{ flex: 1 }}>{formatJsonField(value)}</Typography>
    </Box>
  );
};

// Render doctor note — amber italic block shown below field
const renderNote = (notes: Record<string, string> | null | undefined, key: string) => {
  if (!notes || !notes[key]) return null;
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 0.5,
      bgcolor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 1,
      px: 1, py: 0.5, mb: 0.5, mt: 0.3,
    }}>
      <Typography sx={{ fontSize: 11, color: '#92400E', fontStyle: 'italic', lineHeight: 1.4 }}>
        ✏️ Notatka lekarza: {notes[key]}
      </Typography>
    </Box>
  );
};

// Empty placeholder — gray italic block for unfilled sections/fields
const EmptyPlaceholder = () => (
  <Typography sx={{ fontSize: 12, color: '#9E9E9E', fontStyle: 'italic', py: 0.5 }}>
    Nie uzupełniono
  </Typography>
);

// Section box wrapper: white if has content, gray-tinted if empty
const SectionBox = ({ hasContent, children }: { hasContent: boolean; children: React.ReactNode }) => (
  <Box sx={{
    border: `1px solid ${hasContent ? '#ccc' : '#E0E0E0'}`,
    bgcolor: hasContent ? '#fff' : '#FAFAFA',
    p: 1.5, borderRadius: 1, mb: 2,
    opacity: hasContent ? 1 : 0.75,
  }}>
    {children}
    {!hasContent && <EmptyPlaceholder />}
  </Box>
);

export default function ConsultationViewPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { error: showError, success: showSuccess } = useNotification();

  const getFieldValue = (key: string) => {
    if (!consultation) return undefined;
    if (consultation.dynamicData && Object.prototype.hasOwnProperty.call(consultation.dynamicData, key)) {
      return consultation.dynamicData[key];
    }
    return consultation[key];
  };

  const getScaleImageSrc = (key: string) => {
    if (key.toLowerCase().includes('norwood')) {
      return '/api/consultations/scales/norwood-hamilton.png';
    }
    if (key.toLowerCase().includes('ludwig')) {
      return '/api/consultations/scales/ludwig.png';
    }
    return null;
  };

  useEffect(() => {
    if (id) {
      fetchConsultation();
    } else {
      setError('Brak ID konsultacji');
      setLoading(false);
    }
  }, [id]);

  const fetchConsultation = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/consultations/${id}`);
      setConsultation(response.data.consultation || response.data);
    } catch (error: any) {
      console.error('Błąd pobierania konsultacji:', error);
      const errorMessage = error.response?.data?.error || 'Błąd pobierania konsultacji';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const buildPdfFilename = () => {
    const firstName = consultation?.patient?.firstName || 'pacjent';
    const lastName = consultation?.patient?.lastName || '';
    const dateValue = consultation?.consultationDate ? new Date(consultation.consultationDate) : new Date();
    const dateStr = dateValue.toISOString().split('T')[0];
    const rawName = `${firstName} ${lastName}`.trim();
    const safeName = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    return `konsultacja_${safeName || 'pacjent'}_${dateStr}.pdf`;
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const response = await api.get(`/consultations/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', buildPdfFilename());
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('PDF pobrany pomyślnie');
    } catch (error: any) {
      console.error('Błąd pobierania PDF:', error);
      const errorMessage = error.response?.data?.error || 'Błąd pobierania PDF';
      showError(errorMessage);
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">Ładowanie konsultacji...</Typography>
        </Box>
      </Container>
    );
  }

  if (error || !consultation) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Konsultacja nie znaleziona'}
          </Alert>
          <Button onClick={() => navigate(-1)} startIcon={<ArrowBack />}>
            Powrót
          </Button>
        </Box>
      </Container>
    );
  }

  const hasTemplate = Boolean(consultation?.templateId && consultation?.template?.fields?.length);
  const hairLossNotesValue = getFieldValue('hairLossNotes');
  const oilyHairNotesValue = getFieldValue('oilyHairNotes');
  const supplementsDetailsValue = getFieldValue('supplementsDetails');
  const antibioticsDetailsValue = getFieldValue('antibioticsDetails');

  // Extract fieldNotes (doctor inline notes) — stored as JSON object in DB
  const fieldNotes: Record<string, string> = (() => {
    const raw = getFieldValue('fieldNotes');
    if (!raw) return {};
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    return {};
  })();


  const hasHairLossData = Boolean(
    getFieldValue('hairLossSeverity') ||
    getFieldValue('hairLossLocalization') ||
    getFieldValue('hairLossDuration') ||
    getFieldValue('hairLossShampoos') ||
    hairLossNotesValue
  );
  const hasOilyHairData = Boolean(
    getFieldValue('oilyHairSeverity') ||
    getFieldValue('oilyHairWashingFreq') ||
    getFieldValue('oilyHairDuration') ||
    getFieldValue('oilyHairShampoos') ||
    oilyHairNotesValue
  );

  const renderTemplateField = (field: any) => {
    if (field.type === 'SECTION') {
      return (
        <Box sx={{
          backgroundColor: '#e0e0e0',
          fontWeight: 'bold',
          fontSize: '1rem',
          p: 1,
          mt: 3,
          mb: 2,
          borderLeft: '5px solid #333',
          textTransform: 'uppercase'
        }}>
          {field.label}
        </Box>
      );
    }

    if (field.type === 'SUBSECTION') {
      return (
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, textDecoration: 'underline' }}>
          {field.label}
        </Typography>
      );
    }

    if (field.type === 'IMAGE_SELECT') {
      const value = getFieldValue(field.key);
      const imageSrc = getScaleImageSrc(field.key);
      return (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 'bold', mb: 1 }}>{field.label}</Typography>
          {imageSrc && (
            <Box
              component="img"
              src={imageSrc}
              alt={field.label}
              sx={{ width: '100%', maxWidth: 700, display: 'block', mb: 1 }}
            />
          )}
          <Typography sx={{ fontSize: '0.875rem' }}>
            Wybrany stopień: {value ? formatJsonField(value) : '-'}
          </Typography>
        </Box>
      );
    }

    const value = getFieldValue(field.key);
    const displayValue = (value === undefined || value === null || value === '')
      ? '-'
      : field.type === 'CHECKBOX'
        ? (value ? 'TAK' : 'NIE')
        : formatJsonField(value);

    return (
      <Box sx={{
        display: 'flex',
        borderBottom: '1px dotted #ccc',
        pb: 0.5,
        mb: 0.5,
        fontSize: '0.875rem'
      }}>
        <Typography component="span" sx={{ fontWeight: 'bold', mr: 1, minWidth: '200px' }}>
          {field.label}:
        </Typography>
        <Typography component="span" sx={{ flex: 1 }}>{displayValue}</Typography>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header with actions */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 4
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            color: 'text.secondary',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: alpha('#000', 0.04) }
          }}
        >
          Powrót do pacjenta
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            fullWidth={isMobile}
            variant="outlined"
            startIcon={downloadingPDF ? <CircularProgress size={20} /> : <GetApp />}
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {downloadingPDF ? 'Pobieranie...' : 'Pobierz PDF'}
          </Button>
          <Button
            fullWidth={isMobile}
            variant="outlined"
            onClick={() => navigate(`/patients/${consultation.patient.id}/consultations/new`, { state: { sourceConsultation: consultation } })}
            startIcon={<ContentCopy />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Duplikuj
          </Button>
          <Button
            fullWidth={isMobile}
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/consultations/${id}/edit`)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Edytuj
          </Button>
        </Box>
      </Box>

      {/* Main document - PDF-like layout */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          backgroundColor: '#fff',
          boxShadow: 2,
        }}
      >
        {/* Header */}
        <Box sx={{
          textAlign: 'center',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          mb: 4,
          pb: 3
        }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              textTransform: 'uppercase',
              mb: 1,
              letterSpacing: 1,
              fontSize: { xs: '1.5rem', sm: '2.25rem' }
            }}
          >
            Karta Konsultacyjna
          </Typography>
          <Box sx={{ mt: 3, textAlign: 'right', fontSize: '0.875rem', color: 'text.secondary' }}>
            Data: <strong style={{ color: '#000' }}>{formatDate(consultation.consultationDate)}</strong>
          </Box>
        </Box>

        {/* Patient Info */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>DANE PACJENTA</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography><strong>Imię i nazwisko:</strong> {consultation.patient.firstName} {consultation.patient.lastName}</Typography>
              <Typography><strong>Wiek:</strong> {consultation.patient.age ?? '-'}</Typography>
              <Typography><strong>Płeć:</strong> {consultation.patient.gender === 'MALE' ? 'M' : consultation.patient.gender === 'FEMALE' ? 'K' : '-'}</Typography>
              <Typography><strong>Wykonywany zawód:</strong> {consultation.patient.occupation || '-'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography><strong>Adres zamieszkania:</strong> {consultation.patient.address || '-'}</Typography>
              <Typography><strong>Numer telefonu:</strong> {consultation.patient.phone || '-'}</Typography>
              <Typography><strong>e-mail:</strong> {consultation.patient.email || '-'}</Typography>
              <Typography><strong>Lekarz:</strong> {consultation.doctor.name}</Typography>
            </Grid>
          </Grid>
        </Box>

        {hasTemplate && consultation.template?.fields && (
          <Box sx={{ mb: 3 }}>
            {[...consultation.template.fields]
              .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
              .map((field: any, index: number) => (
                <Box key={field.key || `${field.label}-${index}`} sx={{ mb: field.type === 'SECTION' ? 0 : 0.5 }}>
                  {renderTemplateField(field)}
                </Box>
              ))}
          </Box>
        )}

        {/* Section: Problems — always visible */}
        {!hasTemplate && (
          <>
            <Box sx={{
              backgroundColor: '#e0e0e0', fontWeight: 'bold', fontSize: '1rem',
              p: 1, mt: 3, mb: 2, borderLeft: '5px solid #333', textTransform: 'uppercase'
            }}>
              Problemy zgłaszane przez pacjenta
            </Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {/* 1. Wypadanie */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SectionBox hasContent={hasHairLossData}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                    1. WYPADANIE WŁOSÓW
                  </Typography>
                  {renderCheckboxInfo('Nasilenie', getFieldValue('hairLossSeverity'))}
                  {renderCheckboxInfo('Lokalizacja', getFieldValue('hairLossLocalization'))}
                  {renderCheckboxInfo('Czas trwania', getFieldValue('hairLossDuration'))}
                  {getFieldValue('hairLossShampoos') && renderFieldRow('Szampony', getFieldValue('hairLossShampoos'))}
                  {hairLossNotesValue && renderFieldRow('Uwagi', hairLossNotesValue)}
                  {renderNote(fieldNotes, 'hairLoss')}
                </SectionBox>
              </Grid>
              {/* 2. Pretłuszczanie */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SectionBox hasContent={hasOilyHairData}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                    2. PRETŁUSZCZANIE WŁOSÓW
                  </Typography>
                  {renderCheckboxInfo('Nasilenie', getFieldValue('oilyHairSeverity'))}
                  {renderCheckboxInfo('Częstotliwość mycia', getFieldValue('oilyHairWashingFreq'))}
                  {renderCheckboxInfo('Czas trwania', getFieldValue('oilyHairDuration'))}
                  {getFieldValue('oilyHairShampoos') && renderFieldRow('Szampony', getFieldValue('oilyHairShampoos'))}
                  {oilyHairNotesValue && renderFieldRow('Uwagi', oilyHairNotesValue)}
                  {renderNote(fieldNotes, 'oilyHair')}
                </SectionBox>
              </Grid>
              {/* 3. Łuszczenie */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SectionBox hasContent={Boolean(getFieldValue('scalingSeverity') || getFieldValue('scalingType'))}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                    3. ŁUSZCZENIE SKÓRY GŁOWY
                  </Typography>
                  {renderCheckboxInfo('Nasilenie', getFieldValue('scalingSeverity'))}
                  {renderCheckboxInfo('Typ łuszczenia', getFieldValue('scalingType'))}
                  {renderCheckboxInfo('Czas trwania', getFieldValue('scalingDuration'))}
                  {getFieldValue('scalingOther') && renderFieldRow('Inne', getFieldValue('scalingOther'))}
                  {renderNote(fieldNotes, 'scaling')}
                </SectionBox>
              </Grid>
              {/* 4. Wrażliwość */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <SectionBox hasContent={Boolean(getFieldValue('sensitivitySeverity') || getFieldValue('sensitivityProblemType'))}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                    4. WRAZLIWOŚĆ SKÓRY GŁOWY
                  </Typography>
                  {renderCheckboxInfo('Typ problemu', getFieldValue('sensitivityProblemType'))}
                  {renderCheckboxInfo('Nasilenie', getFieldValue('sensitivitySeverity'))}
                  {renderCheckboxInfo('Czas trwania', getFieldValue('sensitivityDuration'))}
                  {getFieldValue('sensitivityOther') && renderFieldRow('Inne', getFieldValue('sensitivityOther'))}
                  {getFieldValue('inflammatoryStates') && renderFieldRow('Stany zapalne / grudki', getFieldValue('inflammatoryStates'))}
                  {renderNote(fieldNotes, 'sensitivity')}
                </SectionBox>
              </Grid>
            </Grid>
          </>
        )}

        {/* Section: Anamnesis — always visible */}
        {!hasTemplate && (
          <>
            <Box sx={{
              backgroundColor: '#e0e0e0', fontWeight: 'bold', fontSize: '1rem',
              p: 1, mt: 3, mb: 2, borderLeft: '5px solid #333', textTransform: 'uppercase'
            }}>
              Wywiad (Anamneza)
            </Box>
            <Grid container spacing={2} sx={{ mb: 2, fontSize: '0.875rem' }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderCheckboxInfo(FIELD_LABELS['familyHistory'] ?? 'Wypadanie w rodzinie', getFieldValue('familyHistory'))}
                {renderNote(fieldNotes, 'familyHistory')}
                {renderCheckboxInfo(FIELD_LABELS['dermatologyVisits'] ?? 'Dermatolog', getFieldValue('dermatologyVisits'))}
                {getFieldValue('dermatologyVisitsReason') && renderFieldRow(FIELD_LABELS['dermatologyVisitsReason'] ?? 'Powód', getFieldValue('dermatologyVisitsReason'))}
                {renderCheckboxInfo(FIELD_LABELS['pregnancy'] ?? 'Ciąża', getFieldValue('pregnancy'))}
                {renderCheckboxInfo(FIELD_LABELS['menstruationRegularity'] ?? 'Miesiączki', getFieldValue('menstruationRegularity'))}
                {getFieldValue('contraception') && renderFieldRow(FIELD_LABELS['contraception'] ?? 'Antykoncepcja', getFieldValue('contraception'))}
                {renderCheckboxInfo(FIELD_LABELS['stressLevel'] ?? 'Stres', getFieldValue('stressLevel'))}
                {renderCheckboxInfo(FIELD_LABELS['medications'] ?? 'Leki', getFieldValue('medications'))}
                {getFieldValue('medicationsList') && renderFieldRow(FIELD_LABELS['medicationsList'] ?? 'Lista leków', getFieldValue('medicationsList'))}
                {getFieldValue('supplements') && renderFieldRow(FIELD_LABELS['supplements'] ?? 'Suplementy', getFieldValue('supplements'))}
                {supplementsDetailsValue && renderFieldRow(FIELD_LABELS['supplementsDetails'] ?? 'Jakie suplementy?', supplementsDetailsValue)}
                {renderNote(fieldNotes, 'medications')}
                {!getFieldValue('familyHistory') && !getFieldValue('dermatologyVisits') && !getFieldValue('pregnancy') &&
                  !getFieldValue('stressLevel') && !getFieldValue('medications') && <EmptyPlaceholder />}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderCheckboxInfo(FIELD_LABELS['anesthesia'] ?? 'Znieczulenie', getFieldValue('anesthesia'))}
                {renderCheckboxInfo(FIELD_LABELS['chemotherapy'] ?? 'Chemioterapia', getFieldValue('chemotherapy'))}
                {renderCheckboxInfo(FIELD_LABELS['radiotherapy'] ?? 'Radioterapia', getFieldValue('radiotherapy'))}
                {renderCheckboxInfo(FIELD_LABELS['vaccination'] ?? 'Szczepienia', getFieldValue('vaccination'))}
                {getFieldValue('antibiotics') && renderFieldRow(FIELD_LABELS['antibiotics'] ?? 'Antybiotyki', getFieldValue('antibiotics'))}
                {antibioticsDetailsValue && renderFieldRow(FIELD_LABELS['antibioticsDetails'] ?? 'Jakie antybiotyki?', antibioticsDetailsValue)}
                {renderCheckboxInfo(FIELD_LABELS['chronicDiseases'] ?? 'Choroby', getFieldValue('chronicDiseases'))}
                {getFieldValue('chronicDiseasesList') && renderFieldRow(FIELD_LABELS['chronicDiseasesList'] ?? 'Lista chorób', getFieldValue('chronicDiseasesList'))}
                {renderNote(fieldNotes, 'chronicDiseases')}
                {renderCheckboxInfo(FIELD_LABELS['specialists'] ?? 'Specjaliści', getFieldValue('specialists'))}
                {getFieldValue('specialistsList') && renderFieldRow(FIELD_LABELS['specialistsList'] ?? 'Jacy specjaliści?', getFieldValue('specialistsList'))}
                {renderCheckboxInfo(FIELD_LABELS['eatingDisorders'] ?? 'Zab. odżywiania', getFieldValue('eatingDisorders'))}
                {getFieldValue('foodIntolerances') && renderFieldRow(FIELD_LABELS['foodIntolerances'] ?? 'Nietolerancje', getFieldValue('foodIntolerances'))}
                {getFieldValue('diet') && renderFieldRow(FIELD_LABELS['diet'] ?? 'Dieta', getFieldValue('diet'))}
                {getFieldValue('dietDescription') && renderFieldRow(FIELD_LABELS['dietDescription'] ?? 'Opis diety', getFieldValue('dietDescription'))}
                {getFieldValue('allergies') && renderFieldRow(FIELD_LABELS['allergies'] ?? 'Alergie', getFieldValue('allergies'))}
                {renderCheckboxInfo(FIELD_LABELS['metalPartsInBody'] ?? 'Metal w ciele', getFieldValue('metalPartsInBody'))}
                {renderNote(fieldNotes, 'nutrition')}
                {!getFieldValue('chronicDiseases') && !getFieldValue('specialists') && !getFieldValue('eatingDisorders') &&
                  !getFieldValue('allergies') && !getFieldValue('anesthesia') && <EmptyPlaceholder />}
              </Grid>
            </Grid>
            <Box sx={{ borderTop: '1px dashed #ccc', mt: 2, pt: 1, fontSize: '0.875rem', mb: 2 }}>
              <Typography component="strong">Aktualna pielęgnacja:</Typography>{' '}
              {getFieldValue('careRoutineShampoo') ? `Szampon: ${getFieldValue('careRoutineShampoo')}, ` : ''}
              {getFieldValue('careRoutineConditioner') ? `Odżywka: ${getFieldValue('careRoutineConditioner')}, ` : ''}
              {getFieldValue('careRoutineOils') ? `Wcierki: ${getFieldValue('careRoutineOils')}, ` : ''}
              {getFieldValue('careRoutineChemical') ? `Zabiegi: ${getFieldValue('careRoutineChemical')}` : ''}
              {!getFieldValue('careRoutineShampoo') && !getFieldValue('careRoutineConditioner') &&
                !getFieldValue('careRoutineOils') && !getFieldValue('careRoutineChemical') && (
                  <Typography component="span" sx={{ color: '#9E9E9E', fontStyle: 'italic', fontSize: '0.875rem' }}>Nie uzupełniono</Typography>
              )}
            </Box>
            {renderNote(fieldNotes, 'careRoutine')}
          </>
        )}

        {/* Section: Trichoscopy — always visible */}
        {!hasTemplate && (
          <>
            <Box sx={{
              backgroundColor: '#e0e0e0', fontWeight: 'bold', fontSize: '1rem',
              p: 1, mt: 3, mb: 2, borderLeft: '5px solid #333', textTransform: 'uppercase'
            }}>
              Trichoskopia - Badanie
            </Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                {(() => {
                  const hasSkalp = getFieldValue('scalpType') || getFieldValue('scalpAppearance') || getFieldValue('skinLesions') ||
                    getFieldValue('hyperhidrosis') || getFieldValue('hyperkeratinization') || getFieldValue('seborrheaType') ||
                    getFieldValue('dandruffType') || getFieldValue('scalpPH');
                  return (
                    <SectionBox hasContent={Boolean(hasSkalp)}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>SKÓRA GŁOWY</Typography>
                      {renderCheckboxInfo('Typ', getFieldValue('scalpType'))}
                      {renderNote(fieldNotes, 'scalpType')}
                      {renderCheckboxInfo('Objawy', getFieldValue('scalpAppearance'))}
                      {renderCheckboxInfo('Wykwity', getFieldValue('skinLesions'))}
                      {renderCheckboxInfo('Potliwość', getFieldValue('hyperhidrosis'))}
                      {renderCheckboxInfo('Hiperkeratynizacja', getFieldValue('hyperkeratinization'))}
                      {renderCheckboxInfo('Wydzielina', getFieldValue('sebaceousSecretion'))}
                      {renderCheckboxInfo('Łojotok', getFieldValue('seborrheaType'))}
                      {getFieldValue('seborrheaTypeOther') && renderFieldRow('Inne', getFieldValue('seborrheaTypeOther'))}
                      {renderCheckboxInfo('Złuszczanie', getFieldValue('dandruffType'))}
                      {renderCheckboxInfo('pH', getFieldValue('scalpPH'))}
                    </SectionBox>
                  );
                })()}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {(() => {
                  const hasHair = getFieldValue('hairQuality') || getFieldValue('hairDamage') || getFieldValue('hairShape') ||
                    getFieldValue('hairTypes') || getFieldValue('vellusMiniaturizedHairs');
                  return (
                    <SectionBox hasContent={Boolean(hasHair)}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>STAN WŁOSÓW</Typography>
                      {renderCheckboxInfo('Jakość', getFieldValue('hairQuality'))}
                      {renderCheckboxInfo('Uszkodzenia', getFieldValue('hairDamage'))}
                      {renderCheckboxInfo('Przyczyna', getFieldValue('hairDamageReason'))}
                      {renderCheckboxInfo('Kształt', getFieldValue('hairShape'))}
                      {renderCheckboxInfo('Typy', getFieldValue('hairTypes'))}
                      {renderCheckboxInfo('Odrastające', getFieldValue('regrowingHairs'))}
                      {renderCheckboxInfo('Vellus', getFieldValue('vellusMiniaturizedHairs'))}
                    </SectionBox>
                  );
                })()}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {(() => {
                  const hasSpecific = getFieldValue('vascularPatterns') || getFieldValue('perifollicularFeatures') ||
                    getFieldValue('scalpDiseases') || getFieldValue('otherDiagnostics');
                  return (
                    <SectionBox hasContent={Boolean(hasSpecific)}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>CECHY SPECYFICZNE</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {getFieldValue('vascularPatterns') && (<Chip label={formatJsonField(getFieldValue('vascularPatterns'))} size="small" />)}
                        {getFieldValue('perifollicularFeatures') && (<Chip label={formatJsonField(getFieldValue('perifollicularFeatures'))} size="small" />)}
                        {getFieldValue('scalpDiseases') && (<Chip label={formatJsonField(getFieldValue('scalpDiseases'))} size="small" />)}
                        {getFieldValue('otherDiagnostics') && (<Chip label={formatJsonField(getFieldValue('otherDiagnostics'))} size="small" />)}
                      </Box>
                    </SectionBox>
                  );
                })()}
              </Grid>
            </Grid>
          </>
        )}

        {/* Section: Diagnosis and Recommendations */}
        {!hasTemplate && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{
                backgroundColor: '#e0e0e0',
                fontWeight: 'bold',
                fontSize: '1rem',
                p: 1,
                mb: 2,
                borderLeft: '5px solid #333',
                textTransform: 'uppercase'
              }}>
                Rozpoznanie (Diagnoza)
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {getFieldValue('diagnosis') || 'Brak wpisu'}
                </Typography>
                {getFieldValue('alopeciaTypes') && (
                  <Typography variant="body2">Typ: {formatJsonField(getFieldValue('alopeciaTypes'))}</Typography>
                )}
                {getFieldValue('alopeciaType') && (
                  <Typography variant="body2">Klasyfikacja: {getFieldValue('alopeciaType')}</Typography>
                )}
                {getFieldValue('degreeOfThinning') && (
                  <Typography variant="body2">Przerzedzenie: {getFieldValue('degreeOfThinning')}</Typography>
                )}
                {getFieldValue('alopeciaAffectedAreas') && (
                  <Typography variant="body2">Obszary: {formatJsonField(getFieldValue('alopeciaAffectedAreas'))}</Typography>
                )}
                {getFieldValue('miniaturization') && (
                  <Typography variant="body2">Miniaturyzacja: {getFieldValue('miniaturization')}</Typography>
                )}
                {getFieldValue('follicularUnits') && (
                  <Typography variant="body2">Jednostki: {getFieldValue('follicularUnits')}</Typography>
                )}
                {getFieldValue('pullTest') && (
                  <Typography variant="body2">Pull Test: {getFieldValue('pullTest')}</Typography>
                )}
                {getFieldValue('alopeciaOther') && (
                  <Typography variant="body2">Inne: {getFieldValue('alopeciaOther')}</Typography>
                )}
                {getFieldValue('norwoodHamiltonStage') && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Norwood-Hamilton: {getFieldValue('norwoodHamiltonStage')}
                    {getFieldValue('norwoodHamiltonNotes') && ` (${getFieldValue('norwoodHamiltonNotes')})`}
                  </Typography>
                )}
                {getFieldValue('ludwigStage') && (
                  <Typography variant="body2">
                    Ludwig: {getFieldValue('ludwigStage')}
                    {getFieldValue('ludwigNotes') && ` (${getFieldValue('ludwigNotes')})`}
                  </Typography>
                )}
                {/* Scale reference images */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2, justifyContent: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 0.5 }}>Skala Norwooda-Hamiltona</Typography>
                    <img src="/norwood-hamilton.png" alt="Skala Norwooda-Hamiltona" style={{ maxWidth: 350, width: '100%', borderRadius: 6, border: '1px solid #E2E8F0' }} />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', display: 'block', mb: 0.5 }}>Skala M. Ludwiga</Typography>
                    <img src="/ludwig.png" alt="Skala M. Ludwiga" style={{ maxWidth: 220, width: '100%', borderRadius: 6, border: '1px solid #E2E8F0' }} />
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{
                backgroundColor: '#f9f9f9',
                border: '1px solid #ddd',
                p: 2,
                borderRadius: 1
              }}>
                <Box sx={{
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  mb: 2,
                  textTransform: 'uppercase'
                }}>
                  Zalecenia Domowe
                </Box>
                <Box sx={{ fontSize: '0.875rem' }}>
                  {getFieldValue('careRecommendationsWashing') && (
                    <Box sx={{ mb: 1 }}>
                      <Typography component="strong">Mycie:</Typography> {getFieldValue('careRecommendationsWashing')}
                    </Box>
                  )}
                  {getFieldValue('careRecommendationsTopical') && (
                    <Box sx={{ mb: 1 }}>
                      <Typography component="strong">Wcierki:</Typography> {getFieldValue('careRecommendationsTopical')}
                    </Box>
                  )}
                  {getFieldValue('careRecommendationsSupplement') && (
                    <Box sx={{ mb: 1 }}>
                      <Typography component="strong">Suplementy:</Typography> {getFieldValue('careRecommendationsSupplement')}
                    </Box>
                  )}
                  {getFieldValue('careRecommendationsBehavior') && (
                    <Box sx={{ mb: 1 }}>
                      <Typography component="strong">Zachowanie:</Typography> {getFieldValue('careRecommendationsBehavior')}
                    </Box>
                  )}
                  {getFieldValue('visitsProcedures') && (
                    <Box sx={{ mb: 1 }}>
                      <Typography component="strong">Gabinet:</Typography> {getFieldValue('visitsProcedures')}
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* General Remarks — always visible */}
        {!hasTemplate && (
          <Box sx={{
            border: '1px solid #ccc', mt: 3, p: 2,
            backgroundColor: getFieldValue('generalRemarks') ? '#fffbe6' : '#FAFAFA',
            borderRadius: 1
          }}>
            <Typography component="strong">Uwagi dodatkowe: </Typography>
            {getFieldValue('generalRemarks')
              ? <Typography component="span">{getFieldValue('generalRemarks')}</Typography>
              : <Typography component="span" sx={{ color: '#9E9E9E', fontStyle: 'italic', fontSize: '0.875rem' }}>Nie uzupełniono</Typography>
            }
          </Box>
        )}

        {/* Footer */}
        <Box sx={{
          mt: 4,
          pt: 2,
          borderTop: '1px solid #ddd',
          fontSize: '0.75rem',
          textAlign: 'right',
          color: '#666'
        }}>
          <Typography variant="body2">
            Dokument wygenerowany elektronicznie. Lekarz prowadzący: {consultation.doctor.name} | Data wydruku: {formatDateTime(new Date())}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
