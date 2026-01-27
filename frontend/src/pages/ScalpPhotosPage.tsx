import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  useMediaQuery,
  useTheme,
  alpha,
  Paper,
  Avatar,
  CardActionArea,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  CameraAlt,
  Event,
  Image as ImageIcon,
} from '@mui/icons-material';
import { api, BASE_URL } from '../services/api';

export default function ScalpPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (id) {
      fetchPhotos();
    }
  }, [id]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/scalp-photos/patient/${id}`);
      setPhotos(response.data.scalpPhotos);
    } catch (error) {
      console.error('Błąd pobierania zdjęć:', error);
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
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              fontSize: { xs: '1.75rem', sm: '2.125rem' }
            }}
          >
            <CameraAlt fontSize="large" />
            Zdjęcia skóry głowy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            Dokumentacja fotograficzna postępów kuracji
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          fullWidth={isMobile}
          onClick={() => navigate(`/patients/${id}/scalp-photos/new`)}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            py: 1.2,
            px: 3,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          {isMobile ? 'DODAJ ZDJĘCIE' : 'Dodaj zdjęcie'}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {photos.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              <ImageIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>Brak zdjęć</Typography>
              <Typography variant="body2" color="text.disabled">Nie dodano jeszcze żadnej dokumentacji fotograficznej.</Typography>
            </Paper>
          </Grid>
        ) : (
          photos.map((photo) => (
            <Grid key={photo.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                    '& .MuiCardMedia-root': {
                      transform: 'scale(1.05)',
                    }
                  },
                }}
              >
                <CardActionArea onClick={() => navigate(`/patients/${id}/scalp-photos/${photo.id}`)}>
                  <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                    <CardMedia
                      component="img"
                      height={isMobile ? 240 : 220}
                      image={photo.url ? `${BASE_URL}${photo.url}` : `${BASE_URL}/uploads/${photo.filePath?.split(/[/\\]/).pop()}`}
                      alt={photo.originalFilename || 'Zdjęcie skóry głowy'}
                      sx={{
                        transition: 'transform 0.5s ease',
                        backgroundColor: '#f5f5f5',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        console.error('Błąd ładowania obrazu:', img.src);
                        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EBrak zdj%26%23381%3Bcia%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <Box sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      bgcolor: alpha('#000', 0.6),
                      backdropFilter: 'blur(4px)',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Event sx={{ fontSize: 14 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {new Date(photo.date || photo.createdAt).toLocaleDateString('pl-PL')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }} noWrap>
                      {photo.description || 'Bez opisu'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 20, height: 20, bgcolor: 'primary.main', fontSize: 10 }}>
                        {photo.area?.[0] || 'G'}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {photo.area || 'Obszar ogólny'}
                      </Typography>
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))
        )}
        </Grid>
      )}
    </Box>
  );
}


