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
} from '@mui/material';
import {
  Add,
  LocalHospital,
  ChevronRight,
  AccessTime,
  EventNote,
} from '@mui/icons-material';
import { api } from '../services/api';

export default function CarePlansPage() {
  const { id } = useParams<{ id: string }>();
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (id) {
      fetchCarePlans();
    }
  }, [id]);

  const fetchCarePlans = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/care-plans/patient/${id}`);
      setCarePlans(response.data.carePlans);
    } catch (error) {
      console.error('Błąd pobierania planów:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2,
        mb: 4
      }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' }
            }}
          >
            <LocalHospital fontSize="large" />
            Plany opieki
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Zarządzaj kuracją i zaleceniami dla pacjenta
          </Typography>
        </Box>
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      ) : carePlans.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
          <LocalHospital sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>Brak planów opieki</Typography>
          <Typography variant="body2" color="text.disabled">Nie utworzono jeszcze żadnego planu kuracji.</Typography>
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
                  '&:active': { transform: 'scale(0.98)' },
                  '&:hover': {
                    borderColor: 'secondary.main',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  },
                }}
              >
                <CardContent sx={{ p: 0 }}>
                  <Box
                    sx={{
                      p: 3,
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/care-plans/${plan.id}`)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main' }}>
                          <EventNote fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {plan.title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Czas trwania: {plan.totalDurationWeeks} tygodni
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05), color: 'secondary.main' }}
                      >
                        <ChevronRight />
                      </IconButton>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 2,
                        lineHeight: 1.6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      Plan obejmuje kompleksową opiekę trichologiczną dostosowaną do potrzeb pacjenta.
                    </Typography>
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
