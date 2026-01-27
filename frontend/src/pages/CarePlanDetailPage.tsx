import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { Edit, GetApp, ArrowBack } from '@mui/icons-material';
import { api } from '../services/api';

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

export default function CarePlanDetailPage() {
  const { id, carePlanId } = useParams<{ id?: string; carePlanId?: string }>();
  const [carePlan, setCarePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (carePlanId) {
      fetchCarePlan();
    }
  }, [carePlanId]);

  const fetchCarePlan = async () => {
    try {
      const response = await api.get(`/care-plans/${carePlanId}`);
      setCarePlan(response.data.carePlan);
    } catch (error) {
      console.error('Błąd pobierania planu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/care-plans/${carePlanId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `plan-opieki-${carePlanId}.pdf`);
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">Ładowanie...</Typography>
        </Box>
      </Container>
    );
  }

  if (!carePlan) {
    return (
      <Container maxWidth="lg">
        <Typography>Plan opieki nie znaleziony</Typography>
      </Container>
    );
  }

  const patient = carePlan.patient || {};

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header with actions */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: { xs: 2, sm: 3 },
        gap: { xs: 1.5, sm: 2 },
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          size={isMobile ? 'small' : 'medium'}
          sx={{ mb: { xs: 0, sm: 2 } }}
        >
          {isMobile ? 'Powrót' : 'Powrót'}
        </Button>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 2 },
          flexWrap: 'wrap',
          width: { xs: '100%', sm: 'auto' },
        }}>
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
            onClick={() => navigate(`/patients/${id || patient.id}/care-plans/${carePlanId}/edit`)}
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
          borderBottom: '2px solid #333',
          mb: 3,
          pb: 2
        }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            PLAN OPIEKI TRYCHOLOGICZNEJ
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {carePlan.title}
          </Typography>
          <Typography variant="body1">
            Czas trwania: <strong>{carePlan.totalDurationWeeks} tygodni</strong>
          </Typography>
        </Box>

        {/* Patient Info */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Dane pacjenta</Typography>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              {patient.firstName} {patient.lastName}
            </Typography>
            {patient.phone && (
              <Typography><strong>Telefon:</strong> {patient.phone}</Typography>
            )}
            {patient.email && (
              <Typography><strong>Email:</strong> {patient.email}</Typography>
            )}
          </Box>
        </Box>

        {/* Global Notes */}
        {carePlan.notes && (
          <Box sx={{ 
            mb: 3,
            p: 2,
            backgroundColor: '#fff3cd',
            borderLeft: '4px solid #ffc107',
            borderRadius: 1
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Uwagi ogólne</Typography>
            <Typography>{carePlan.notes}</Typography>
          </Box>
        )}

        {/* Weeks */}
        {carePlan.weeks && carePlan.weeks.length > 0 && (
          <Box sx={{ mt: 3 }}>
            {carePlan.weeks.map((week: any) => (
              <Card 
                key={week.id} 
                sx={{ 
                  mb: 3,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                }}
              >
                <CardContent>
                  <Typography variant="h5" sx={{ 
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    mb: 2,
                    color: '#2c3e50',
                    borderBottom: '2px solid #3498db',
                    pb: 1
                  }}>
                    Tydzień {week.weekNumber}
                  </Typography>
                  
                  <Box sx={{ ml: 1 }}>
                    {week.description && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#555' }}>
                          Opis:
                        </Typography>
                        <Typography sx={{ ml: 2 }}>{week.description}</Typography>
                      </Box>
                    )}
                    
                    {week.washingRoutine && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#555' }}>
                          Rutyna mycia:
                        </Typography>
                        <Typography sx={{ ml: 2 }}>{week.washingRoutine}</Typography>
                      </Box>
                    )}
                    
                    {week.topicalProducts && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#555' }}>
                          Produkty miejscowe:
                        </Typography>
                        <Typography sx={{ ml: 2 }}>{week.topicalProducts}</Typography>
                      </Box>
                    )}
                    
                    {week.supplements && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#555' }}>
                          Suplementacja:
                        </Typography>
                        <Typography sx={{ ml: 2 }}>{week.supplements}</Typography>
                      </Box>
                    )}
                    
                    {week.inClinicProcedures && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#555' }}>
                          Zabiegi w klinice:
                        </Typography>
                        <Typography sx={{ ml: 2 }}>{week.inClinicProcedures}</Typography>
                      </Box>
                    )}
                    
                    {week.remarks && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#555' }}>
                          Uwagi:
                        </Typography>
                        <Typography sx={{ ml: 2 }}>{week.remarks}</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ 
          mt: 4,
          pt: 2,
          borderTop: '1px solid #ddd',
          fontSize: '0.875rem',
          textAlign: 'right',
          color: '#666'
        }}>
          <Typography variant="body2">
            Wygenerowano: {formatDateTime(new Date())}
          </Typography>
          {carePlan.createdBy && (
            <Typography variant="body2">
              Lekarz: {carePlan.createdBy.name}
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
