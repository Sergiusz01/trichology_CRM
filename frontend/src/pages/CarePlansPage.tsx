import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  alpha,
  useTheme,
  useMediaQuery,
  Avatar,
  IconButton,
  Paper,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import {
  Add,
  LocalHospital,
  ChevronRight,
  AccessTime,
  EventNote,
  PersonOutline,
  ArrowBack
} from '@mui/icons-material';
import { api } from '../services/api';
import { formatPhone } from '../utils/formatPhone';

export default function CarePlansPage() {
  const { id } = useParams<{ id: string }>();
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [carePlansRes, patientRes] = await Promise.all([
        api.get(`/care-plans/patient/${id}`),
        api.get(`/patients/${id}`)
      ]);
      setCarePlans(carePlansRes.data.carePlans);
      setPatient(patientRes.data.patient || patientRes.data);
    } catch (error) {
      console.error('Błąd pobierania danych:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate(`/patients/${id}`)} 
        sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
      >
        Powrót do profilu
      </Button>

      {/* ── HERO HEADER WITH PATIENT INFO ── */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.main} 100%)`,
          color: '#fff',
          borderRadius: 4,
          p: { xs: 3, sm: 4 },
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 3,
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: '0.12em', fontWeight: 700 }}>
            <LocalHospital sx={{ fontSize: 16, verticalAlign: 'sub', mr: 0.5 }} />
            Trychologia
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, fontSize: { xs: '1.75rem', sm: '2.25rem' } }}>
            Plany Opieki
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1, maxWidth: 400 }}>
            Zarządzaj długoterminowymi kuracjami i spersonalizowanymi zaleceniami domowymi.
          </Typography>
        </Box>

        {patient && (
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 3, p: 2, minWidth: { xs: '100%', md: 240 } }}>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Pacjent
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
              {patient.firstName} {patient.lastName}
            </Typography>
            <Stack direction="column" spacing={0.5}>
              {patient.phone && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>📞 {formatPhone(patient.phone)}</Typography>
              )}
              {patient.email && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>✉️ {patient.email}</Typography>
              )}
            </Stack>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          color="secondary"
          fullWidth={isMobile}
          onClick={() => navigate(`/patients/${id}/care-plans/new`)}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            py: 1.2,
            px: 3,
            boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.2)}`,
          }}
        >
          Nowy plan
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
          <CircularProgress />
        </Box>
      ) : carePlans.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
          <LocalHospital sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>Brak planów opieki</Typography>
          <Typography variant="body2" color="text.disabled">Ten pacjent nie ma jeszcze przypisanego żadnego planu kuracji.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {carePlans.map((plan) => (
            <Grid key={plan.id} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:active': { transform: 'scale(0.98)' },
                  '&:hover': {
                    borderColor: 'secondary.main',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  },
                }}
              >
                {/* Active indicator bar */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, bgcolor: plan.isActive ? 'success.main' : 'text.disabled' }} />
                
                <CardContent sx={{ p: 0 }}>
                  <Box
                    sx={{
                      p: 3, pl: 4,
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', height: '100%',
                    }}
                    onClick={() => navigate(`/patients/${id}/care-plans/${plan.id}`)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main', width: 40, height: 40 }}>
                          <EventNote fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.5 }}>
                            {plan.title}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip 
                              icon={<AccessTime sx={{ fontSize: '14px !important' }} />} 
                              label={`${plan.totalDurationWeeks} tygodni`} 
                              size="small" 
                              color="secondary"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip 
                              label={plan.isActive ? 'Aktywny' : 'Zakończony'} 
                              size="small"
                              sx={{ 
                                fontWeight: 600, 
                                bgcolor: plan.isActive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.text.disabled, 0.1),
                                color: plan.isActive ? 'success.dark' : 'text.secondary'
                              }}
                            />
                          </Stack>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05), color: 'secondary.main', flexShrink: 0 }}
                      >
                        <ChevronRight />
                      </IconButton>
                    </Box>

                    {plan.notes && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          lineHeight: 1.6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          bgcolor: alpha(theme.palette.warning.main, 0.05),
                          p: 1.5,
                          borderRadius: 2,
                          borderLeft: `2px solid ${theme.palette.warning.main}`,
                        }}
                      >
                        {plan.notes}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
