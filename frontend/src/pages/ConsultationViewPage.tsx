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
} from '@mui/material';
import { Edit, GetApp, ArrowBack } from '@mui/icons-material';
import { api } from '../services/api';

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

export default function ConsultationViewPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (id) {
      fetchConsultation();
    }
  }, [id]);

  const fetchConsultation = async () => {
    try {
      const response = await api.get(`/consultations/${id}`);
      setConsultation(response.data.consultation);
    } catch (error) {
      console.error('Błąd pobierania konsultacji:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/consultations/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `konsultacja-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Błąd pobierania PDF:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography>Ładowanie...</Typography>
        </Box>
      </Container>
    );
  }

  if (!consultation) {
    return (
      <Container maxWidth="lg">
        <Typography>Konsultacja nie znaleziona</Typography>
      </Container>
    );
  }

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
            startIcon={<GetApp />}
            onClick={handleDownloadPDF}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Pobierz PDF
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
          <Typography
            variant="subtitle1"
            sx={{
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: 'primary.main',
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '1rem' }
            }}
          >
            Rich Diagnostic
          </Typography>
          <Box sx={{ mt: 3, textAlign: 'right', fontSize: '0.875rem', color: 'text.secondary' }}>
            Data: <strong style={{ color: '#000' }}>{formatDate(consultation.consultationDate)}</strong>
          </Box>
        </Box>

        {/* Patient Info */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Dane pacjenta</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography><strong>Imię i nazwisko:</strong> {consultation.patient.firstName} {consultation.patient.lastName}</Typography>
              {consultation.patient.age && (
                <Typography><strong>Wiek:</strong> {consultation.patient.age} lat</Typography>
              )}
              {consultation.patient.gender && (
                <Typography><strong>Płeć:</strong> {consultation.patient.gender === 'MALE' ? 'Mężczyzna' : consultation.patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}</Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {consultation.patient.phone && (
                <Typography><strong>Telefon:</strong> {consultation.patient.phone}</Typography>
              )}
              {consultation.patient.email && (
                <Typography><strong>Email:</strong> {consultation.patient.email}</Typography>
              )}
              <Typography><strong>Lekarz:</strong> {consultation.doctor.name}</Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Section: Problems */}
        {(consultation.hairLossSeverity || consultation.oilyHairSeverity || consultation.scalingSeverity || consultation.sensitivitySeverity) && (
          <>
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
              Problemy zgłaszane przez pacjenta
            </Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {(consultation.hairLossSeverity || consultation.hairLossLocalization) && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                      1. WYPADANIE WŁOSÓW
                    </Typography>
                    {renderCheckboxInfo('Nasilenie', consultation.hairLossSeverity)}
                    {renderCheckboxInfo('Lokalizacja', consultation.hairLossLocalization)}
                    {renderCheckboxInfo('Czas trwania', consultation.hairLossDuration)}
                    {consultation.hairLossShampoos && renderFieldRow('Szampony', consultation.hairLossShampoos)}
                  </Box>
                </Grid>
              )}
              {(consultation.oilyHairSeverity || consultation.oilyHairWashingFreq) && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                      2. PRZETŁUSZCZANIE WŁOSÓW
                    </Typography>
                    {renderCheckboxInfo('Nasilenie', consultation.oilyHairSeverity)}
                    {renderCheckboxInfo('Częstotliwość mycia', consultation.oilyHairWashingFreq)}
                    {renderCheckboxInfo('Czas trwania', consultation.oilyHairDuration)}
                    {consultation.oilyHairShampoos && renderFieldRow('Szampony', consultation.oilyHairShampoos)}
                    {consultation.oilyHairNotes && renderFieldRow('Uwagi', consultation.oilyHairNotes)}
                  </Box>
                </Grid>
              )}
              {(consultation.scalingSeverity || consultation.scalingType) && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                      3. ŁUSZCZENIE SKÓRY GŁOWY
                    </Typography>
                    {renderCheckboxInfo('Nasilenie', consultation.scalingSeverity)}
                    {renderCheckboxInfo('Typ', consultation.scalingType)}
                    {renderCheckboxInfo('Czas trwania', consultation.scalingDuration)}
                    {consultation.scalingOther && renderFieldRow('Inne', consultation.scalingOther)}
                  </Box>
                </Grid>
              )}
              {(consultation.sensitivitySeverity || consultation.sensitivityProblemType) && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                      4. WRAŻLIWOŚĆ / INNE
                    </Typography>
                    {renderCheckboxInfo('Problem', consultation.sensitivityProblemType)}
                    {renderCheckboxInfo('Nasilenie', consultation.sensitivitySeverity)}
                    {renderCheckboxInfo('Czas trwania', consultation.sensitivityDuration)}
                    {consultation.sensitivityOther && renderFieldRow('Inne', consultation.sensitivityOther)}
                    {renderCheckboxInfo('Stany zapalne', consultation.inflammatoryStates)}
                  </Box>
                </Grid>
              )}
            </Grid>
          </>
        )}

        {/* Section: Anamnesis */}
        {(consultation.familyHistory || consultation.medications || consultation.stressLevel) && (
          <>
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
              Wywiad (Anamneza)
            </Box>
            <Grid container spacing={2} sx={{ mb: 2, fontSize: '0.875rem' }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderCheckboxInfo('Rodzina', consultation.familyHistory)}
                {renderCheckboxInfo('Dermatolog', consultation.dermatologyVisits)}
                {consultation.dermatologyVisitsReason && renderFieldRow('Powód', consultation.dermatologyVisitsReason)}
                {renderCheckboxInfo('Ciąża', consultation.pregnancy)}
                {renderCheckboxInfo('Miesiączki', consultation.menstruationRegularity)}
                {consultation.contraception && renderFieldRow('Hormony', consultation.contraception)}
                {renderCheckboxInfo('Stres', consultation.stressLevel)}
                {renderCheckboxInfo('Leki', consultation.medications)}
                {consultation.medicationsList && renderFieldRow('Lista leków', consultation.medicationsList)}
                {consultation.supplements && renderFieldRow('Suplementy', consultation.supplements)}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {renderCheckboxInfo('Znieczulenie', consultation.anesthesia)}
                {renderCheckboxInfo('Chemioterapia', consultation.chemotherapy)}
                {renderCheckboxInfo('Radioterapia', consultation.radiotherapy)}
                {renderCheckboxInfo('Szczepienia', consultation.vaccination)}
                {consultation.antibiotics && renderFieldRow('Antybiotyki', consultation.antibiotics)}
                {renderCheckboxInfo('Choroby', consultation.chronicDiseases)}
                {consultation.chronicDiseasesList && renderFieldRow('Lista chorób', consultation.chronicDiseasesList)}
                {renderCheckboxInfo('Specjaliści', consultation.specialists)}
                {consultation.specialistsList && renderFieldRow('Jakiego', consultation.specialistsList)}
                {renderCheckboxInfo('Zab. odżywiania', consultation.eatingDisorders)}
                {consultation.foodIntolerances && renderFieldRow('Nietolerancje', consultation.foodIntolerances)}
                {renderCheckboxInfo('Dieta', consultation.diet)}
                {renderCheckboxInfo('Alergie', consultation.allergies)}
                {renderCheckboxInfo('Metal w ciele', consultation.metalPartsInBody)}
              </Grid>
            </Grid>
            {(consultation.careRoutineShampoo || consultation.careRoutineConditioner || consultation.careRoutineOils || consultation.careRoutineChemical) && (
              <Box sx={{
                borderTop: '1px dashed #ccc',
                mt: 2,
                pt: 1,
                fontSize: '0.875rem',
                mb: 2
              }}>
                <Typography component="strong">Aktualna pielęgnacja:</Typography>{' '}
                {consultation.careRoutineShampoo && `Szampon: ${consultation.careRoutineShampoo}, `}
                {consultation.careRoutineConditioner && `Odżywka: ${consultation.careRoutineConditioner}, `}
                {consultation.careRoutineOils && `Wcierki: ${consultation.careRoutineOils}, `}
                {consultation.careRoutineChemical && `Zabiegi: ${consultation.careRoutineChemical}`}
              </Box>
            )}
          </>
        )}

        {/* Section: Trichoscopy */}
        {(consultation.scalpType || consultation.hairQuality || consultation.seborrheaType) && (
          <>
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
              Trichoskopia - Badanie
            </Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                    SKÓRA GŁOWY
                  </Typography>
                  {renderCheckboxInfo('Typ', consultation.scalpType)}
                  {renderCheckboxInfo('Objawy', consultation.scalpAppearance)}
                  {renderCheckboxInfo('Wykwity', consultation.skinLesions)}
                  {renderCheckboxInfo('Potliwość', consultation.hyperhidrosis)}
                  {renderCheckboxInfo('Hiperkeratynizacja', consultation.hyperkeratinization)}
                  {renderCheckboxInfo('Wydzielina', consultation.sebaceousSecretion)}
                  {renderCheckboxInfo('Łojotok', consultation.seborrheaType)}
                  {consultation.seborrheaTypeOther && renderFieldRow('Inne', consultation.seborrheaTypeOther)}
                  {renderCheckboxInfo('Złuszczanie', consultation.dandruffType)}
                  {renderCheckboxInfo('pH', consultation.scalpPH)}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                    STAN WŁOSÓW
                  </Typography>
                  {renderCheckboxInfo('Jakość', consultation.hairQuality)}
                  {renderCheckboxInfo('Uszkodzenia', consultation.hairDamage)}
                  {renderCheckboxInfo('Przyczyna', consultation.hairDamageReason)}
                  {renderCheckboxInfo('Kształt', consultation.hairShape)}
                  {renderCheckboxInfo('Typy', consultation.hairTypes)}
                  {renderCheckboxInfo('Odrastające', consultation.regrowingHairs)}
                  {renderCheckboxInfo('Vellus', consultation.vellusMiniaturizedHairs)}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ border: '1px solid #ccc', p: 1.5, borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textDecoration: 'underline' }}>
                    CECHY SPECYFICZNE
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {consultation.vascularPatterns && (
                      <Chip label={formatJsonField(consultation.vascularPatterns)} size="small" />
                    )}
                    {consultation.perifollicularFeatures && (
                      <Chip label={formatJsonField(consultation.perifollicularFeatures)} size="small" />
                    )}
                    {consultation.scalpDiseases && (
                      <Chip label={formatJsonField(consultation.scalpDiseases)} size="small" />
                    )}
                    {consultation.otherDiagnostics && (
                      <Chip label={formatJsonField(consultation.otherDiagnostics)} size="small" />
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </>
        )}

        {/* Section: Diagnosis and Recommendations */}
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
                {consultation.diagnosis || 'Brak wpisu'}
              </Typography>
              {consultation.alopeciaTypes && (
                <Typography variant="body2">Typ: {formatJsonField(consultation.alopeciaTypes)}</Typography>
              )}
              {consultation.alopeciaType && (
                <Typography variant="body2">Klasyfikacja: {consultation.alopeciaType}</Typography>
              )}
              {consultation.degreeOfThinning && (
                <Typography variant="body2">Przerzedzenie: {consultation.degreeOfThinning}</Typography>
              )}
              {consultation.alopeciaAffectedAreas && (
                <Typography variant="body2">Obszary: {formatJsonField(consultation.alopeciaAffectedAreas)}</Typography>
              )}
              {consultation.miniaturization && (
                <Typography variant="body2">Miniaturyzacja: {consultation.miniaturization}</Typography>
              )}
              {consultation.follicularUnits && (
                <Typography variant="body2">Jednostki: {consultation.follicularUnits}</Typography>
              )}
              {consultation.pullTest && (
                <Typography variant="body2">Pull Test: {consultation.pullTest}</Typography>
              )}
              {consultation.alopeciaOther && (
                <Typography variant="body2">Inne: {consultation.alopeciaOther}</Typography>
              )}
              {consultation.norwoodHamiltonStage && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Norwood-Hamilton: {consultation.norwoodHamiltonStage}
                  {consultation.norwoodHamiltonNotes && ` (${consultation.norwoodHamiltonNotes})`}
                </Typography>
              )}
              {consultation.ludwigStage && (
                <Typography variant="body2">
                  Ludwig: {consultation.ludwigStage}
                  {consultation.ludwigNotes && ` (${consultation.ludwigNotes})`}
                </Typography>
              )}
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
                {consultation.careRecommendationsWashing && (
                  <Box sx={{ mb: 1 }}>
                    <Typography component="strong">Mycie:</Typography> {consultation.careRecommendationsWashing}
                  </Box>
                )}
                {consultation.careRecommendationsTopical && (
                  <Box sx={{ mb: 1 }}>
                    <Typography component="strong">Wcierki:</Typography> {consultation.careRecommendationsTopical}
                  </Box>
                )}
                {consultation.careRecommendationsSupplement && (
                  <Box sx={{ mb: 1 }}>
                    <Typography component="strong">Suplementy:</Typography> {consultation.careRecommendationsSupplement}
                  </Box>
                )}
                {consultation.careRecommendationsBehavior && (
                  <Box sx={{ mb: 1 }}>
                    <Typography component="strong">Zachowanie:</Typography> {consultation.careRecommendationsBehavior}
                  </Box>
                )}
                {consultation.visitsProcedures && (
                  <Box sx={{ mb: 1 }}>
                    <Typography component="strong">Gabinet:</Typography> {consultation.visitsProcedures}
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* General Remarks */}
        {consultation.generalRemarks && (
          <Box sx={{
            border: '1px solid #ccc',
            mt: 3,
            p: 2,
            backgroundColor: '#fffbe6',
            borderRadius: 1
          }}>
            <Typography component="strong">Uwagi dodatkowe:</Typography> {consultation.generalRemarks}
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
