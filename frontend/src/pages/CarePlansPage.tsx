import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Add } from '@mui/icons-material';
import { api } from '../services/api';

export default function CarePlansPage() {
  const { id } = useParams<{ id: string }>();
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchCarePlans();
    }
  }, [id]);

  const fetchCarePlans = async () => {
    try {
      const response = await api.get(`/care-plans/patient/${id}`);
      setCarePlans(response.data.carePlans);
    } catch (error) {
      console.error('Błąd pobierania planów:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Plany opieki</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => navigate(`/patients/${id}/care-plans/new`)}
        >
          Nowy plan
        </Button>
      </Box>

      {carePlans.length === 0 ? (
        <Typography>Brak planów opieki</Typography>
      ) : (
        carePlans.map((plan) => (
          <Card key={plan.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">{plan.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {plan.totalDurationWeeks} tygodni
              </Typography>
              <Button
                size="small"
                onClick={() => navigate(`/care-plans/${plan.id}`)}
                sx={{ mt: 1 }}
              >
                Zobacz szczegóły
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}


