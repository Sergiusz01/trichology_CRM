import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid, Card, CardMedia, useMediaQuery, useTheme } from '@mui/material';
import { Add } from '@mui/icons-material';
import { api } from '../services/api';

export default function ScalpPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<any[]>([]);
  const [cacheBuster] = useState(() => Date.now());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (id) {
      fetchPhotos();
    }
  }, [id]);

  const fetchPhotos = async () => {
    try {
      const response = await api.get(`/scalp-photos/patient/${id}`);
      console.log('Pobrane zdjęcia:', response.data.scalpPhotos);
      setPhotos(response.data.scalpPhotos);
    } catch (error) {
      console.error('Błąd pobierania zdjęć:', error);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: { xs: 2, sm: 3 },
        gap: { xs: 1.5, sm: 2 },
      }}>
        <Typography 
          variant="h4"
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' },
            fontWeight: 'bold',
          }}
        >
          Zdjęcia skóry głowy
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => navigate(`/patients/${id}/scalp-photos/new`)}
          size={isMobile ? 'small' : 'medium'}
          fullWidth={isMobile}
          sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' },
          }}
        >
          {isMobile ? 'Dodaj' : 'Dodaj zdjęcie'}
        </Button>
      </Box>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
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
                  height={isMobile ? 180 : 200}
                  image={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'}${photo.url || `/uploads/${photo.filePath?.split(/[/\\]/).pop()}`}?v=${cacheBuster}`}
                  alt={photo.originalFilename || 'Zdjęcie skóry głowy'}
                  sx={{
                    imageOrientation: 'from-image',
                    objectFit: 'cover',
                    backgroundColor: '#f5f5f5',
                    width: '100%',
                  }}
                  onLoad={() => {
                    console.log('Obraz załadowany:', photo.url);
                  }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    const originalSrc = img.src;
                    console.error('Błąd ładowania obrazu:', {
                      url: photo.url,
                      fullUrl: originalSrc,
                      photo: photo
                    });
                    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EBrak zdj%26%23381%3Bcia%3C/text%3E%3C/svg%3E';
                  }}
                />
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}


