import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Button, Grid, Card, CardMedia } from '@mui/material';
import { Add } from '@mui/icons-material';
import { api } from '../services/api';

export default function ScalpPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchPhotos();
    }
  }, [id]);

  const fetchPhotos = async () => {
    try {
      const response = await api.get(`/scalp-photos/patient/${id}`);
      setPhotos(response.data.scalpPhotos);
    } catch (error) {
      console.error('Błąd pobierania zdjęć:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Zdjęcia skóry głowy</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => navigate(`/patients/${id}/scalp-photos/new`)}
        >
          Dodaj zdjęcie
        </Button>
      </Box>

      <Grid container spacing={2}>
        {photos.length === 0 ? (
          <Grid item xs={12}>
            <Typography>Brak zdjęć</Typography>
          </Grid>
        ) : (
          photos.map((photo) => (
            <Grid item xs={12} sm={6} md={4} key={photo.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 4 },
                }}
                onClick={() => navigate(`/patients/${id}/scalp-photos/${photo.id}`)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={`http://localhost:3001${photo.url}`}
                  alt={photo.originalFilename}
                />
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}


