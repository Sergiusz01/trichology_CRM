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
  Chip,
  IconButton,
  alpha,
  useTheme,
  useMediaQuery,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Science,
  Event,
  ChevronRight,
  Timeline,
} from '@mui/icons-material';
import { api } from '../services/api';

export default function LabResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [labResults, setLabResults] = useState<any[]>([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (id) {
      fetchLabResults();
    }
  }, [id]);

  const fetchLabResults = async () => {
    try {
      const response = await api.get(`/lab-results/patient/${id}`);
      setLabResults(response.data.labResults);
    } catch (error) {
      console.error('Błąd pobierania wyników:', error);
    }
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'LOW':
      case 'HIGH':
        return 'error';
      case 'NORMAL':
        return 'success';
      default:
        return 'default';
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
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' }
            }}
          >
            <Science fontSize="large" />
            Wyniki badań
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Historia wyników laboratoryjnych pacjenta
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          fullWidth={isMobile}
          onClick={() => navigate(`/patients/${id}/lab-results/new`)}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            py: 1.2,
            px: 3,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          Dodaj wynik
        </Button>
      </Box>

      {labResults.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Science sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>Brak wyników badań</Typography>
          <Typography variant="body2" color="text.disabled">Nie wprowadzono jeszcze żadnych wyników dla tego pacjenta.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {labResults.map((result) => (
            <Grid key={result.id} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                        <Event fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {new Date(result.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Timeline sx={{ fontSize: 14 }} /> Analiza parametrów
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/patients/${id}/lab-results/${result.id}/edit`)}
                      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main' }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Box>

                  <Divider sx={{ my: 2, opacity: 0.6 }} />

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Ferrytyna</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {result.ferritin} <Typography component="span" variant="caption" color="text.secondary">{result.ferritinUnit}</Typography>
                        </Typography>
                      </Box>
                      <Chip
                        label={result.ferritinFlag || 'OK'}
                        color={getFlagColor(result.ferritinFlag || '')}
                        size="small"
                        sx={{ fontWeight: 700, borderRadius: 1.5 }}
                      />
                    </Box>

                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      Zakres referencyjny: {result.ferritinRefLow} - {result.ferritinRefHigh} {result.ferritinUnit}
                    </Typography>
                  </Stack>

                  <Button
                    fullWidth
                    endIcon={<ChevronRight />}
                    onClick={() => navigate(`/patients/${id}/lab-results/${result.id}`)}
                    sx={{
                      mt: 3,
                      textTransform: 'none',
                      fontWeight: 700,
                      justifyContent: 'space-between',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                    }}
                  >
                    Szczegóły badania
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
