import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Delete,
} from '@mui/icons-material';
import { api } from '../services/api';
import { SecureImage } from '../components/SecureImage';
import { buildSecureImageUrl } from '../utils/imageHandler';

interface Annotation {
  id: string;
  type: string;
  shapeType: string;
  coordinates: any;
  label: string;
  createdAt: string;
}

export default function ScalpPhotoDetailPage() {
  const { id, photoId } = useParams<{ id?: string; photoId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [photo, setPhoto] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null);
  const [annotationDialog, setAnnotationDialog] = useState(false);
  const [annotationType, setAnnotationType] = useState('PROBLEM_AREA');
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [selectedShapeType, setSelectedShapeType] = useState<'RECT' | 'CIRCLE'>('RECT');

  useEffect(() => {
    if (photoId) {
      fetchPhoto();
    }
  }, [photoId]);

  const fetchPhoto = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/scalp-photos/${photoId}`);
      setPhoto(response.data.scalpPhoto);
      setNotes(response.data.scalpPhoto.notes || '');
      setAnnotations(response.data.scalpPhoto.annotations || []);
    } catch (error: any) {
      console.error('Błąd pobierania zdjęcia:', error);
      setError(error.response?.data?.error || 'Błąd pobierania zdjęcia');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await api.put(`/scalp-photos/${photoId}`, { notes });
      setEditingNotes(false);
      setSuccess('Uwagi zapisane pomyślnie');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Błąd zapisywania uwag');
    }
  };


  const handleImageLoad = () => {
    if (imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Use natural dimensions (browser handles EXIF orientation for img element)
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      // Calculate scale to fit image in container
      const containerWidth = 800; // Max width
      const containerHeight = 600; // Max height
      const imgAspect = imgWidth / imgHeight;
      const containerAspect = containerWidth / containerHeight;

      let drawWidth, drawHeight;
      if (imgAspect > containerAspect) {
        drawWidth = containerWidth;
        drawHeight = containerWidth / imgAspect;
      } else {
        drawHeight = containerHeight;
        drawWidth = containerHeight * imgAspect;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;
      setScale(drawWidth / imgWidth);

      drawImageAndAnnotations();
    }
  };

  const drawImageAndAnnotations = () => {
    if (!imageRef.current || !canvasRef.current) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Safety guard: don't draw a broken image (would throw InvalidStateError)
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) return;

    // Draw image (browser handles EXIF orientation for img element, so we use it as-is)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw annotations
    annotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.type === 'PROBLEM_AREA' ? '#ff0000' : '#0000ff';
      ctx.fillStyle = annotation.type === 'PROBLEM_AREA' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)';
      ctx.lineWidth = 2;

      const coords = annotation.coordinates;

      if (annotation.shapeType === 'RECT') {
        const x = coords.x * scale;
        const y = coords.y * scale;
        const width = (coords.width || 100) * scale;
        const height = (coords.height || 100) * scale;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);

        // Draw label
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.fillText(annotation.label, x + 5, y + 20);
      } else if (annotation.shapeType === 'CIRCLE') {
        const x = coords.x * scale;
        const y = coords.y * scale;
        const radius = (coords.radius || 50) * scale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw label
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.fillText(annotation.label, x - radius, y - radius - 5);
      } else if (annotation.shapeType === 'POLYGON' && coords.points) {
        ctx.beginPath();
        ctx.moveTo(coords.points[0].x * scale, coords.points[0].y * scale);
        for (let i = 1; i < coords.points.length; i++) {
          ctx.lineTo(coords.points[i].x * scale, coords.points[i].y * scale);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw label at first point
        if (coords.points.length > 0) {
          ctx.fillStyle = '#000';
          ctx.font = '14px Arial';
          ctx.fillText(annotation.label, coords.points[0].x * scale, coords.points[0].y * scale - 5);
        }
      }
    });

    // Draw current annotation being drawn
    if (currentAnnotation && startPos && drawing) {
      ctx.strokeStyle = '#00ff00';
      ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
      ctx.lineWidth = 2;

      if (selectedShapeType === 'RECT') {
        const x = Math.min(startPos.x, currentAnnotation.x);
        const y = Math.min(startPos.y, currentAnnotation.y);
        const width = Math.abs(currentAnnotation.x - startPos.x);
        const height = Math.abs(currentAnnotation.y - startPos.y);
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
      } else if (selectedShapeType === 'CIRCLE') {
        const radius = Math.sqrt(
          Math.pow(currentAnnotation.x - startPos.x, 2) +
          Math.pow(currentAnnotation.y - startPos.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete && canvasRef.current) {
      drawImageAndAnnotations();
    }
  }, [annotations, currentAnnotation, scale, drawing, startPos, selectedShapeType]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });
    setDrawing(true);
    setCurrentAnnotation({ x, y, shapeType: selectedShapeType });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current || !startPos) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentAnnotation({ x, y, shapeType: selectedShapeType });
  };

  const handleCanvasMouseUp = () => {
    if (!drawing || !startPos || !currentAnnotation) return;

    // Check if annotation has minimum size
    const minSize = 10;
    const width = Math.abs(currentAnnotation.x - startPos.x);
    const height = Math.abs(currentAnnotation.y - startPos.y);

    if (selectedShapeType === 'RECT' && (width < minSize || height < minSize)) {
      setDrawing(false);
      setStartPos(null);
      setCurrentAnnotation(null);
      return;
    }

    if (selectedShapeType === 'CIRCLE') {
      const radius = Math.sqrt(
        Math.pow(currentAnnotation.x - startPos.x, 2) +
        Math.pow(currentAnnotation.y - startPos.y, 2)
      );
      if (radius < minSize) {
        setDrawing(false);
        setStartPos(null);
        setCurrentAnnotation(null);
        return;
      }
    }

    setDrawing(false);
    setAnnotationDialog(true);
  };

  const handleSaveAnnotation = async () => {
    if (!annotationLabel.trim()) {
      setError('Proszę podać etykietę');
      return;
    }

    if (!startPos || !currentAnnotation) {
      setError('Brak danych adnotacji');
      return;
    }

    try {
      const coords: any = {};

      if (selectedShapeType === 'RECT') {
        coords.x = Math.min(startPos.x, currentAnnotation.x) / scale;
        coords.y = Math.min(startPos.y, currentAnnotation.y) / scale;
        coords.width = Math.abs(currentAnnotation.x - startPos.x) / scale;
        coords.height = Math.abs(currentAnnotation.y - startPos.y) / scale;
      } else if (selectedShapeType === 'CIRCLE') {
        coords.x = startPos.x / scale;
        coords.y = startPos.y / scale;
        coords.radius = Math.sqrt(
          Math.pow(currentAnnotation.x - startPos.x, 2) +
          Math.pow(currentAnnotation.y - startPos.y, 2)
        ) / scale;
      }

      await api.post(`/scalp-photos/${photoId}/annotations`, {
        type: annotationType,
        shapeType: selectedShapeType,
        coordinates: coords,
        label: annotationLabel,
      });

      setAnnotationDialog(false);
      setCurrentAnnotation(null);
      setStartPos(null);
      setAnnotationLabel('');
      setSuccess('Adnotacja dodana pomyślnie');
      setTimeout(() => setSuccess(''), 3000);
      fetchPhoto(); // Refresh annotations
    } catch (error: any) {
      setError(error.response?.data?.error || 'Błąd dodawania adnotacji');
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę adnotację?')) return;

    try {
      await api.delete(`/scalp-photos/annotations/${annotationId}`);
      setSuccess('Adnotacja usunięta pomyślnie');
      setTimeout(() => setSuccess(''), 3000);
      fetchPhoto(); // Refresh annotations
    } catch (error: any) {
      setError(error.response?.data?.error || 'Błąd usuwania adnotacji');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Ładowanie...</Typography>
      </Box>
    );
  }

  if (!photo) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Zdjęcie nie znalezione</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton
          onClick={() => navigate(id ? `/patients/${id}` : (photo?.patient?.id ? `/patients/${photo.patient.id}` : '/patients'))}
          sx={{ mr: 1 }}
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">Zdjęcie skóry głowy</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
              <img
                ref={imageRef}
                src={buildSecureImageUrl(photo.filename || photo.filePath)}
                alt={photo.originalFilename || 'Zdjęcie skóry głowy'}
                onLoad={() => {
                  console.log('Obraz załadowany:', photo.filename || photo.filePath);
                  handleImageLoad();
                }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  console.error('Błąd ładowania obrazu:', {
                    src: img.src,
                    filename: photo.filename,
                    filePath: photo.filePath
                  });
                  setError(`Nie można załadować obrazu: ${photo.filename || photo.filePath}`);
                }}
                style={{ maxWidth: '100%', height: 'auto', display: 'none', imageOrientation: 'from-image' }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  border: '1px solid #ccc',
                  cursor: drawing ? 'crosshair' : 'default',
                  maxWidth: '100%',
                  height: 'auto',
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              />
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Wybierz kształt:
                </Typography>
                <Button
                  variant={selectedShapeType === 'RECT' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    setSelectedShapeType('RECT');
                    setCurrentAnnotation(null);
                    setStartPos(null);
                  }}
                >
                  Prostokąt
                </Button>
                <Button
                  variant={selectedShapeType === 'CIRCLE' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    setSelectedShapeType('CIRCLE');
                    setCurrentAnnotation(null);
                    setStartPos(null);
                  }}
                >
                  Koło
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  Kliknij i przeciągnij na zdjęciu, aby dodać adnotację
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Uwagi</Typography>
              {!editingNotes ? (
                <IconButton size="small" onClick={() => setEditingNotes(true)}>
                  <Edit />
                </IconButton>
              ) : (
                <Box>
                  <IconButton size="small" onClick={handleSaveNotes} color="primary">
                    <Save />
                  </IconButton>
                  <IconButton size="small" onClick={() => { setEditingNotes(false); setNotes(photo.notes || ''); }}>
                    <Cancel />
                  </IconButton>
                </Box>
              )}
            </Box>
            {editingNotes ? (
              <TextField
                fullWidth
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodaj uwagi do zdjęcia..."
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {photo.notes || 'Brak uwag'}
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Adnotacje ({annotations.length})
            </Typography>
            {annotations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Brak adnotacji. Kliknij i przeciągnij na zdjęciu, aby dodać.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {annotations.map((annotation) => (
                  <Box
                    key={annotation.id}
                    sx={{
                      p: 1,
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Chip
                        label={annotation.type === 'PROBLEM_AREA' ? 'Obszar problemowy' : 'Uwaga'}
                        size="small"
                        color={annotation.type === 'PROBLEM_AREA' ? 'error' : 'primary'}
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2">{annotation.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(annotation.createdAt).toLocaleDateString('pl-PL')}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteAnnotation(annotation.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={annotationDialog} onClose={() => setAnnotationDialog(false)}>
        <DialogTitle>Dodaj adnotację</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Typ</InputLabel>
            <Select
              value={annotationType}
              onChange={(e) => setAnnotationType(e.target.value)}
              label="Typ"
            >
              <MenuItem value="PROBLEM_AREA">Obszar problemowy</MenuItem>
              <MenuItem value="NOTE">Uwaga</MenuItem>
              <MenuItem value="OTHER">Inne</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Etykieta"
            value={annotationLabel}
            onChange={(e) => setAnnotationLabel(e.target.value)}
            placeholder="np. Łuszczenie, Zaczerwienie..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnotationDialog(false)}>Anuluj</Button>
          <Button onClick={handleSaveAnnotation} variant="contained">
            Zapisz
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

