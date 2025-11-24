import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Card, CardContent, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore, GetApp } from '@mui/icons-material';
import { api } from '../services/api';

export default function CarePlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [carePlan, setCarePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchCarePlan();
    }
  }, [id]);

  const fetchCarePlan = async () => {
    try {
      const response = await api.get(`/care-plans/${id}`);
      setCarePlan(response.data.carePlan);
    } catch (error) {
      console.error('Błąd pobierania planu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/care-plans/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `plan-opieki-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Błąd pobierania PDF:', error);
    }
  };

  if (loading) {
    return <Typography>Ładowanie...</Typography>;
  }

  if (!carePlan) {
    return <Typography>Plan opieki nie znaleziony</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{carePlan.title}</Typography>
        <Button
          variant="contained"
          startIcon={<GetApp />}
          onClick={handleDownloadPDF}
        >
          Pobierz PDF
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" gutterBottom>
          Czas trwania: {carePlan.totalDurationWeeks} tygodni
        </Typography>
        {carePlan.notes && (
          <Card sx={{ mt: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Uwagi ogólne
              </Typography>
              <Typography>{carePlan.notes}</Typography>
            </CardContent>
          </Card>
        )}

        {carePlan.weeks?.map((week: any) => (
          <Accordion key={week.id}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Tydzień {week.weekNumber}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {week.description && (
                <Typography><strong>Opis:</strong> {week.description}</Typography>
              )}
              {week.washingRoutine && (
                <Typography sx={{ mt: 1 }}>
                  <strong>Rutyna mycia:</strong> {week.washingRoutine}
                </Typography>
              )}
              {week.topicalProducts && (
                <Typography sx={{ mt: 1 }}>
                  <strong>Produkty miejscowe:</strong> {week.topicalProducts}
                </Typography>
              )}
              {week.supplements && (
                <Typography sx={{ mt: 1 }}>
                  <strong>Suplementacja:</strong> {week.supplements}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
}


