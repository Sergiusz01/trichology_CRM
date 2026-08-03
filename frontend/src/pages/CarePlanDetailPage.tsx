import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Container, Card, CardContent,
  useMediaQuery, useTheme, CircularProgress, Alert, Chip,
  LinearProgress, Stack, Divider, alpha,
} from '@mui/material';
import { Edit, GetApp, ArrowBack, CheckCircle, Schedule } from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { formatPhone } from '../utils/formatPhone';

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });

const WEEK_SECTIONS = [
  { key: 'description',        label: 'Cel tygodnia',         emoji: '🎯', color: '#6366f1' },
  { key: 'washingRoutine',     label: 'Rutyna mycia głowy',   emoji: '🚿', color: '#0ea5e9' },
  { key: 'topicalProducts',    label: 'Produkty miejscowe',   emoji: '💊', color: '#10b981' },
  { key: 'supplements',        label: 'Suplementacja',        emoji: '🔬', color: '#f59e0b' },
  { key: 'inClinicProcedures', label: 'Zabiegi w klinice',   emoji: '🏥', color: '#ef4444' },
  { key: 'remarks',            label: 'Ważne wskazówki',      emoji: '📝', color: '#8b5cf6' },
] as const;

export default function CarePlanDetailPage() {
  const { id, carePlanId } = useParams<{ id?: string; carePlanId?: string }>();
  const [carePlan, setCarePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { error: showError, success: showSuccess } = useNotification();

  useEffect(() => {
    if (carePlanId) fetchCarePlan();
    else { setError('Brak ID planu opieki'); setLoading(false); }
  }, [carePlanId]);

  const fetchCarePlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/care-plans/${carePlanId}`);
      setCarePlan(response.data.carePlan || response.data);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Błąd pobierania planu opieki';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const response = await api.get(`/care-plans/${carePlanId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `plan-opieki-${carePlanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('PDF pobrany pomyślnie');
    } catch (error: any) {
      showError(error.response?.data?.error || 'Błąd pobierania PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <CircularProgress size={48} />
      <Typography color="text.secondary">Ładowanie planu opieki...</Typography>
    </Box>
  );

  if (error || !carePlan) return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Plan opieki nie znaleziony'}</Alert>
        <Button onClick={() => navigate(-1)} startIcon={<ArrowBack />}>Powrót</Button>
      </Box>
    </Container>
  );

  const patient = carePlan.patient || {};
  const totalWeeks = carePlan.totalDurationWeeks || carePlan.weeks?.length || 0;
  const weeksWithContent = (carePlan.weeks || []).filter((w: any) =>
    w.description || w.washingRoutine || w.topicalProducts || w.supplements || w.inClinicProcedures || w.remarks
  ).length;

  return (
    <Box sx={{ pb: 6 }}>
      {/* ── Action bar ───────────────────────────────────────────── */}
      <Box sx={{
        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 3, gap: 1.5,
      }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/patients/${id || patient.id}/care-plans`)} size="small">
          Powrót do planów
        </Button>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="outlined" size="small"
            startIcon={downloadingPDF ? <CircularProgress size={16} /> : <GetApp />}
            onClick={handleDownloadPDF} disabled={downloadingPDF}
            sx={{ borderRadius: 2 }}
          >
            {downloadingPDF ? 'Pobieranie...' : 'Pobierz PDF'}
          </Button>
          <Button
            variant="contained" size="small" startIcon={<Edit />}
            onClick={() => navigate(`/patients/${id || patient.id}/care-plans/${carePlanId}/edit`)}
            sx={{ borderRadius: 2 }}
          >
            Edytuj plan
          </Button>
        </Stack>
      </Box>

      {/* ── Hero header ─────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.main} 100%)`,
          color: '#fff', borderRadius: 4, p: { xs: 3, sm: 4 }, mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: '0.12em', fontSize: '0.65rem' }}>
              🌿 PLAN OPIEKI TRYCHOLOGICZNEJ
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1.2 }}>
              {carePlan.title}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
              <Chip
                label={`📅 ${totalWeeks} tygodni`}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, borderRadius: 2 }}
                size="small"
              />
              <Chip
                label={carePlan.isActive ? '✅ Aktywny' : '⏸️ Nieaktywny'}
                sx={{ bgcolor: carePlan.isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, borderRadius: 2 }}
                size="small"
              />
              <Chip
                label={`${weeksWithContent} tyg. skonfigurowanych`}
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, borderRadius: 2 }}
                size="small"
              />
            </Stack>
          </Box>

          {/* Patient info */}
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 3, px: 2.5, py: 2, minWidth: 180 }}>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Pacjent
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {patient.firstName} {patient.lastName}
            </Typography>
            {patient.phone && (
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                📞 {formatPhone(patient.phone)}
              </Typography>
            )}
            {patient.email && (
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                ✉️ {patient.email}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Progress */}
        {totalWeeks > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Postęp konfiguracji</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>
                {weeksWithContent}/{totalWeeks} tygodni
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(weeksWithContent / totalWeeks) * 100}
              sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#fff' } }}
            />
          </Box>
        )}
      </Paper>

      {/* ── General notes ────────────────────────────────────────── */}
      {carePlan.notes && (
        <Paper elevation={0} sx={{
          p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3,
          bgcolor: alpha(theme.palette.warning.main, 0.08),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
          borderLeft: `4px solid ${theme.palette.warning.main}`,
        }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            📋 Informacje ogólne o planie
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {carePlan.notes}
          </Typography>
        </Paper>
      )}

      {/* ── Weeks ────────────────────────────────────────────────── */}
      {carePlan.weeks && carePlan.weeks.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule sx={{ color: 'secondary.main' }} />
            Program tygodniowy
          </Typography>

          {carePlan.weeks.map((week: any) => {
            const sections = WEEK_SECTIONS.filter(s => week[s.key]);
            const isEmpty = sections.length === 0;

            return (
              <Card
                key={week.id || week.weekNumber}
                elevation={0}
                sx={{
                  mb: 2.5, borderRadius: 3,
                  border: '1px solid', borderColor: 'divider',
                  overflow: 'hidden',
                  opacity: isEmpty ? 0.5 : 1,
                }}
              >
                {/* Week header */}
                <Box sx={{
                  px: { xs: 2, sm: 3 }, py: 1.75,
                  display: 'flex', alignItems: 'center', gap: 2,
                  bgcolor: alpha(theme.palette.secondary.main, 0.06),
                  borderBottom: '1px solid', borderColor: 'divider',
                }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    bgcolor: theme.palette.secondary.main, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1rem',
                  }}>
                    {week.weekNumber}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Tydzień {week.weekNumber}
                    </Typography>
                    {isEmpty && (
                      <Typography variant="caption" color="text.disabled">Brak szczegółowych zaleceń</Typography>
                    )}
                  </Box>
                </Box>

                {!isEmpty && (
                  <CardContent sx={{ px: { xs: 2, sm: 3 }, py: 2, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      {sections.map((section, idx) => (
                        <Box
                          key={section.key}
                          sx={{
                            p: 2, borderRadius: 2.5,
                            bgcolor: alpha(section.color, 0.06),
                            border: `1px solid ${alpha(section.color, 0.18)}`,
                            gridColumn: (section.key === 'description' || section.key === 'remarks') ? { sm: '1 / -1' } : 'auto',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: section.color, display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
                          >
                            {section.emoji} {section.label}
                          </Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.75, whiteSpace: 'pre-line', color: 'text.primary' }}>
                            {week[section.key]}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </Box>
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="caption" color="text.disabled">
          Utworzono: {formatDate(carePlan.createdAt || new Date())}
          {carePlan.createdBy && ` • Lekarz: ${carePlan.createdBy.name}`}
        </Typography>
        {carePlan.updatedAt && (
          <Typography variant="caption" color="text.disabled">
            Ostatnia edycja: {formatDate(carePlan.updatedAt)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
