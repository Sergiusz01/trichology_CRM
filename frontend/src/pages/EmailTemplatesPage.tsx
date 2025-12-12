import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle, Refresh } from '@mui/icons-material';
import { api } from '../services/api';

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CONSULTATION',
    subject: '',
    htmlBody: '',
    textBody: '',
    isDefault: false,
    isActive: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Błąd pobierania szablonów:', error);
    }
  };

  const handleOpenDialog = (template?: any) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        name: template.name,
        type: template.type,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody || '',
        isDefault: template.isDefault,
        isActive: template.isActive,
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        name: '',
        type: 'CONSULTATION',
        subject: '',
        htmlBody: '',
        textBody: '',
        isDefault: false,
        isActive: true,
      });
    }
    setDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTemplate(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccess('');

      if (selectedTemplate) {
        await api.put(`/email-templates/${selectedTemplate.id}`, formData);
        setSuccess('Szablon został zaktualizowany');
      } else {
        await api.post('/email-templates', formData);
        setSuccess('Szablon został utworzony');
      }

      setTimeout(() => {
        handleCloseDialog();
        fetchTemplates();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Wystąpił błąd');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/email-templates/${selectedTemplate.id}`);
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Wystąpił błąd');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      CONSULTATION: 'Konsultacja',
      CARE_PLAN: 'Plan opieki',
      LAB_RESULT: 'Wynik badania',
      CUSTOM: 'Niestandardowy',
    };
    return labels[type] || type;
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
          Szablony emaili
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 2 },
          flexWrap: 'wrap',
          width: { xs: '100%', sm: 'auto' },
        }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={async () => {
              try {
                setInitializing(true);
                setError('');
                await api.post('/email-templates/initialize-defaults');
                setSuccess('Domyślne szablony zostały zainicjalizowane');
                fetchTemplates();
                setTimeout(() => setSuccess(''), 3000);
              } catch (err: any) {
                setError(err.response?.data?.error || 'Wystąpił błąd podczas inicjalizacji');
              } finally {
                setInitializing(false);
              }
            }}
            disabled={initializing}
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              flex: { xs: '1 1 auto', sm: '0 0 auto' },
            }}
          >
            {isMobile ? 'Inicjalizuj' : 'Inicjalizuj domyślne'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              flex: { xs: '1 1 auto', sm: '0 0 auto' },
            }}
          >
            {isMobile ? 'Nowy' : 'Nowy szablon'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ 
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <Table sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  Nazwa
                </TableCell>
                <TableCell sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                }}>
                  Typ
                </TableCell>
                <TableCell sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', md: 'table-cell' },
                }}>
                  Temat
                </TableCell>
                <TableCell sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', sm: 'table-cell' },
                }}>
                  Domyślny
                </TableCell>
                <TableCell sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', sm: 'table-cell' },
                }}>
                  Aktywny
                </TableCell>
                <TableCell align="right" sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap',
                }}>
                  Akcje
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    maxWidth: { xs: 150, sm: 'none' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {template.name}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}>
                    <Chip 
                      label={getTypeLabel(template.type)} 
                      size="small"
                      sx={{ 
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 20, sm: 24 },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', md: 'table-cell' },
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {template.subject}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', sm: 'table-cell' },
                  }}>
                    {template.isDefault && <CheckCircle color="primary" fontSize={isMobile ? 'small' : 'medium'} />}
                  </TableCell>
                  <TableCell sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', sm: 'table-cell' },
                  }}>
                    <Chip
                      label={template.isActive ? 'Tak' : 'Nie'}
                      color={template.isActive ? 'success' : 'default'}
                      size="small"
                      sx={{ 
                        fontSize: { xs: '0.65rem', sm: '0.75rem' },
                        height: { xs: 20, sm: 24 },
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(template)}
                      color="primary"
                    >
                      <Edit fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setDeleteDialogOpen(true);
                      }}
                      color="error"
                    >
                      <Delete fontSize={isMobile ? 'small' : 'medium'} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit/Create Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            maxHeight: { xs: '90vh', sm: 'none' },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {selectedTemplate ? 'Edytuj szablon' : 'Nowy szablon'}
        </DialogTitle>
        <DialogContent sx={{ 
          overflowY: { xs: 'auto', sm: 'visible' },
          px: { xs: 1.5, sm: 3 },
        }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nazwa szablonu"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Typ</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="Typ"
              >
                <MenuItem value="CONSULTATION">Konsultacja</MenuItem>
                <MenuItem value="CARE_PLAN">Plan opieki</MenuItem>
                <MenuItem value="LAB_RESULT">Wynik badania</MenuItem>
                <MenuItem value="CUSTOM">Niestandardowy</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Temat emaila"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              fullWidth
              required
              helperText="Możesz użyć zmiennych: {{patientName}}, {{doctorName}}, {{consultationDate}}, itp."
            />

            <TextField
              label="Treść HTML"
              value={formData.htmlBody}
              onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
              fullWidth
              required
              multiline
              rows={10}
              helperText="Możesz użyć zmiennych: {{patientName}}, {{doctorName}}, {{consultationDate}}, itp."
            />

            <TextField
              label="Treść tekstowa (opcjonalna)"
              value={formData.textBody}
              onChange={(e) => setFormData({ ...formData, textBody: e.target.value })}
              fullWidth
              multiline
              rows={5}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
              }
              label="Ustaw jako domyślny szablon dla tego typu"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Aktywny"
            />
          </Box>
        </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            <Button 
              onClick={handleCloseDialog}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
            >
              {selectedTemplate ? 'Zapisz' : 'Utwórz'}
            </Button>
          </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Usuń szablon
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Czy na pewno chcesz usunąć szablon <strong>"{selectedTemplate?.name}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            size={isMobile ? 'small' : 'medium'}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            size={isMobile ? 'small' : 'medium'}
          >
            Usuń
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

