import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import { Edit, GetApp, ExpandMore } from '@mui/icons-material';
import { api } from '../services/api';

export default function ConsultationViewPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const renderField = (label: string, value: any) => {
    if (!value) return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}:
        </Typography>
        <Typography variant="body1">{value}</Typography>
      </Box>
    );
  };

  if (loading) {
    return <Typography>Ładowanie...</Typography>;
  }

  if (!consultation) {
    return <Typography>Konsultacja nie znaleziona</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Konsultacja</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={handleDownloadPDF}
          >
            Pobierz PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/consultations/${id}/edit`)}
          >
            Edytuj
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Data konsultacji: {new Date(consultation.consultationDate).toLocaleDateString('pl-PL')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pacjent: {consultation.patient.firstName} {consultation.patient.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lekarz: {consultation.doctor.name}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Hair Loss Section */}
        {(consultation.hairLossSeverity || consultation.hairLossLocalization) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">1. Wypadanie włosów</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Nasilenie', consultation.hairLossSeverity)}
              {renderField('Lokalizacja', consultation.hairLossLocalization)}
              {renderField('Czas trwania', consultation.hairLossDuration)}
              {renderField('Używane szampony', consultation.hairLossShampoos)}
              {renderField('Uwagi', consultation.hairLossNotes)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Oily Hair Section */}
        {(consultation.oilyHairSeverity || consultation.oilyHairWashingFreq) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">2. Przetłuszczanie się włosów</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Nasilenie', consultation.oilyHairSeverity)}
              {renderField('Częstotliwość mycia', consultation.oilyHairWashingFreq)}
              {renderField('Czas trwania', consultation.oilyHairDuration)}
              {renderField('Używane szampony', consultation.oilyHairShampoos)}
              {renderField('Uwagi', consultation.oilyHairNotes)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Scaling Section */}
        {(consultation.scalingSeverity || consultation.scalingType) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">3. Łuszczenie się skóry głowy</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Nasilenie', consultation.scalingSeverity)}
              {renderField('Typ', consultation.scalingType)}
              {renderField('Czas trwania', consultation.scalingDuration)}
              {renderField('Uwagi', consultation.scalingNotes)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Scalp Sensitivity Section */}
        {(consultation.sensitivitySeverity || consultation.sensitivityProblemType) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">4. Wrażliwość skóry głowy</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Nasilenie', consultation.sensitivitySeverity)}
              {renderField('Typ problemu', consultation.sensitivityProblemType)}
              {renderField('Czas trwania', consultation.sensitivityDuration)}
              {renderField('Uwagi', consultation.sensitivityNotes)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Inflammatory States */}
        {(consultation.inflammatoryStates || consultation.papules) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">5. Stany zapalne / Grudki</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Stany zapalne', consultation.inflammatoryStates)}
              {renderField('Grudki', consultation.papules)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Interview/Anamnesis */}
        {(consultation.familyHistory || consultation.medications || consultation.stressLevel) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">6. Wywiad / Anamneza</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  {renderField('Wywiad rodzinny', consultation.familyHistory)}
                  {renderField('Wizyty u dermatologa', consultation.dermatologyVisits)}
                  {renderField('Ciąża', consultation.pregnancy)}
                  {renderField('Regularność miesiączkowania', consultation.menstruationRegularity)}
                  {renderField('Antykoncepcja', consultation.contraception)}
                  {renderField('Poziom stresu', consultation.stressLevel)}
                </Grid>
                <Grid item xs={12} md={6}>
                  {renderField('Leki', consultation.medications)}
                  {renderField('Suplementy', consultation.supplements)}
                  {renderField('Choroby przewlekłe', consultation.chronicDiseases)}
                  {renderField('Dieta', consultation.diet)}
                  {renderField('Alergie', consultation.allergies)}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Trichoscopy */}
        {(consultation.scalpType || consultation.hairQuality || consultation.seborrheaType) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">7. Trichoskopia</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  {renderField('Typ skóry głowy', consultation.scalpType)}
                  {renderField('Wygląd skóry głowy', consultation.scalpAppearance)}
                  {renderField('Objawy', consultation.scalpSymptoms)}
                  {renderField('Zmiany skórne', consultation.skinLesions)}
                  {renderField('Typ łojotoku', consultation.seborrheaType)}
                  {renderField('Typ łupieżu', consultation.dandruffType)}
                </Grid>
                <Grid item xs={12} md={6}>
                  {renderField('Jakość włosów', consultation.hairQuality)}
                  {renderField('Kształt włosów', consultation.hairShape)}
                  {renderField('Uszkodzenie włosów', consultation.hairDamage)}
                  {renderField('Przyczyna uszkodzenia', consultation.hairDamageReason)}
                  {renderField('Włosy odrastające', consultation.regrowingHairs)}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Diagnostics */}
        {(consultation.vascularPatterns || consultation.seborrheicDermatitis) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">8. Diagnostyka</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Wzorce naczyniowe', consultation.vascularPatterns)}
              {renderField('Cechy okołomieszkowe', consultation.perifollicularFeatures)}
              {renderField('Łojotokowe zapalenie skóry', consultation.seborrheicDermatitis)}
              {renderField('LLP', consultation.LLP)}
              {renderField('AD', consultation.AD)}
              {renderField('Grzybica', consultation.mycosis)}
              {renderField('Łuszczyca', consultation.psoriasis)}
              {renderField('Inne cechy', consultation.otherDiagnostics)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Alopecia Diagnostics */}
        {(consultation.alopeciaTypes || consultation.degreeOfThinning) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">9. Diagnostyka łysienia</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Typy łysienia', consultation.alopeciaTypes)}
              {renderField('Stopień przerzedzenia', consultation.degreeOfThinning)}
              {renderField('Obszary objęte', consultation.affectedAreas)}
              {renderField('Miniaturyzacja', consultation.miniaturization)}
              {renderField('Jednostki mieszkowe', consultation.follicularUnits)}
              {renderField('Test pociągania', consultation.pullTest)}
              {renderField('Inne', consultation.alopeciaOther)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Diagnosis */}
        {consultation.diagnosis && (
          <Card sx={{ mt: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                10. Rozpoznanie
              </Typography>
              <Typography variant="body1">{consultation.diagnosis}</Typography>
            </CardContent>
          </Card>
        )}

        {/* Care Recommendations */}
        {(consultation.careRecommendationsWashing ||
          consultation.careRecommendationsTopical ||
          consultation.careRecommendationsSupplement) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">11. Zalecenia</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderField('Produkty do mycia', consultation.careRecommendationsWashing)}
              {renderField('Produkty miejscowe', consultation.careRecommendationsTopical)}
              {renderField('Suplementacja', consultation.careRecommendationsSupplement)}
              {renderField('Zmiany w zachowaniu', consultation.careRecommendationsBehavior)}
              {renderField('Dieta', consultation.careRecommendationsDiet)}
              {renderField('Inne', consultation.careRecommendationsOther)}
            </AccordionDetails>
          </Accordion>
        )}

        {/* Visits/Procedures */}
        {consultation.visitsProcedures && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">12. Wizyty / Zabiegi</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>{consultation.visitsProcedures}</Typography>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Scales */}
        {(consultation.norwoodHamiltonStage || consultation.ludwigStage) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">13. Skale Norwood-Hamilton i Ludwig</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  {renderField('Stopień Norwood-Hamilton', consultation.norwoodHamiltonStage)}
                  {renderField('Uwagi', consultation.norwoodHamiltonNotes)}
                </Grid>
                <Grid item xs={12} md={6}>
                  {renderField('Stopień Ludwig', consultation.ludwigStage)}
                  {renderField('Uwagi', consultation.ludwigNotes)}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* General Remarks */}
        {consultation.generalRemarks && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                14. Uwagi ogólne
              </Typography>
              <Typography>{consultation.generalRemarks}</Typography>
            </CardContent>
          </Card>
        )}
      </Paper>
    </Box>
  );
}


