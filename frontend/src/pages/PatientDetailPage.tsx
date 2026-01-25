import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Alert,
  Avatar,
  Container,
  CircularProgress,
  Stack,
  alpha,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Email,
  Assignment,
  Science,
  PhotoCamera,
  LocalHospital,
  ArrowBack,
  Restore,
  DeleteForever,
  Archive,
  Phone,
  LocationOn,
  Work,
  CalendarToday,
} from '@mui/icons-material';
import { api } from '../services/api';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  address?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 5, px: { xs: 2, md: 4 } }}>{children}</Box>}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [scalpPhotos, setScalpPhotos] = useState<any[]>([]);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan' | null;
    id: string | null;
    name: string;
  }>({ open: false, type: null, id: null, name: '' });
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    type: 'consultation' | 'labResult' | 'carePlan' | null;
    id: string | null;
    name: string;
  }>({ open: false, type: null, id: null, name: '' });
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{
    open: boolean;
    type: 'consultation' | 'labResult' | 'carePlan' | null;
    id: string | null;
    name: string;
  }>({ open: false, type: null, id: null, name: '' });
  const [showArchived, setShowArchived] = useState<{
    consultations: boolean;
    labResults: boolean;
    carePlans: boolean;
  }>({ consultations: false, labResults: false, carePlans: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      fetchPatient();
    }
  }, [id, showArchived]);

  useEffect(() => {
    if (location.state?.refresh && id) {
      fetchPatient();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, id]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/patients/${id}`);
      setPatient(response.data.patient);
      setScalpPhotos(response.data.patient.scalpPhotos || []);

      const consultationsResponse = await api.get(`/consultations/patient/${id}`, {
        params: { archived: showArchived.consultations ? 'true' : 'false' },
      });
      setConsultations(consultationsResponse.data.consultations || []);

      const labResultsResponse = await api.get(`/lab-results/patient/${id}`, {
        params: { archived: showArchived.labResults ? 'true' : 'false' },
      });
      setLabResults(labResultsResponse.data.labResults || []);

      const carePlansResponse = await api.get(`/care-plans/patient/${id}`, {
        params: { archived: showArchived.carePlans ? 'true' : 'false' },
      });
      setCarePlans(carePlansResponse.data.carePlans || []);
    } catch (error) {
      console.error('Błąd pobierania pacjenta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (
    type: 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan',
    id: string,
    name: string
  ) => {
    setDeleteDialog({ open: true, type, id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id || !deleteDialog.type) return;

    try {
      setError('');
      setSuccess('');

      switch (deleteDialog.type) {
        case 'patient':
          await api.delete(`/patients/${deleteDialog.id}`);
          setSuccess('Pacjent został zarchiwizowany');
          setTimeout(() => navigate('/patients'), 1500);
          break;
        case 'consultation':
          await api.delete(`/consultations/${deleteDialog.id}`);
          setSuccess('Konsultacja została zarchiwizowana');
          fetchPatient();
          break;
        case 'labResult':
          await api.delete(`/lab-results/${deleteDialog.id}`);
          setSuccess('Wynik badania został usunięty');
          fetchPatient();
          break;
        case 'scalpPhoto':
          await api.delete(`/scalp-photos/${deleteDialog.id}`);
          setSuccess('Zdjęcie zostało usunięte');
          fetchPatient();
          break;
        case 'carePlan':
          await api.delete(`/care-plans/${deleteDialog.id}`);
          setSuccess('Plan opieki został usunięty');
          fetchPatient();
          break;
      }

      setDeleteDialog({ open: false, type: null, id: null, name: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd podczas usuwania');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, type: null, id: null, name: '' });
  };

  const handleRestoreClick = (
    type: 'consultation' | 'labResult' | 'carePlan',
    id: string,
    name: string
  ) => {
    setRestoreDialog({ open: true, type, id, name });
  };

  const handleRestoreConfirm = async () => {
    if (!restoreDialog.id || !restoreDialog.type) return;

    try {
      setError('');
      setSuccess('');
      switch (restoreDialog.type) {
        case 'consultation':
          await api.post(`/consultations/${restoreDialog.id}/restore`);
          setSuccess('Konsultacja została przywrócona');
          break;
        case 'labResult':
          await api.post(`/lab-results/${restoreDialog.id}/restore`);
          setSuccess('Wynik badania został przywrócony');
          break;
        case 'carePlan':
          await api.post(`/care-plans/${restoreDialog.id}/restore`);
          setSuccess('Plan opieki został przywrócony');
          break;
      }
      setRestoreDialog({ open: false, type: null, id: null, name: '' });
      fetchPatient();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd podczas przywracania');
    }
  };

  const handlePermanentDeleteClick = (
    type: 'consultation' | 'labResult' | 'carePlan',
    id: string,
    name: string
  ) => {
    setPermanentDeleteDialog({ open: true, type, id, name });
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!permanentDeleteDialog.id || !permanentDeleteDialog.type) return;

    try {
      setError('');
      setSuccess('');
      switch (permanentDeleteDialog.type) {
        case 'consultation':
          await api.delete(`/consultations/${permanentDeleteDialog.id}/permanent`);
          setSuccess('Konsultacja została trwale usunięta zgodnie z RODO');
          break;
        case 'labResult':
          await api.delete(`/lab-results/${permanentDeleteDialog.id}/permanent`);
          setSuccess('Wynik badania został trwale usunięty zgodnie z RODO');
          break;
        case 'carePlan':
          await api.delete(`/care-plans/${permanentDeleteDialog.id}/permanent`);
          setSuccess('Plan opieki został trwale usunięty zgodnie z RODO');
          break;
      }
      setPermanentDeleteDialog({ open: false, type: null, id: null, name: '' });
      fetchPatient();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd podczas trwałego usuwania');
    }
  };

  const handleSendEmail = async (
    type: 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan',
    itemId: string,
    itemName: string
  ) => {
    if (!patient?.email) {
      setError('Pacjent nie ma zapisanego adresu email');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      let endpoint = '';
      switch (type) {
        case 'consultation':
          endpoint = `/email/consultation/${itemId}`;
          break;
        case 'labResult':
          endpoint = `/email/lab-result/${itemId}`;
          break;
        case 'scalpPhoto':
          endpoint = `/email/scalp-photo/${itemId}`;
          break;
        case 'carePlan':
          endpoint = `/email/care-plan/${itemId}`;
          break;
      }

      await api.post(endpoint, {
        recipientEmail: patient.email,
      });

      setSuccess(`${itemName} wysłane na email pacjenta`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd wysyłania emaila');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <CircularProgress size={48} thickness={3} sx={{ color: '#1d1d1f' }} />
      </Box>
    );
  }

  if (!patient) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Pacjent nie znaleziony</Alert>
      </Container>
    );
  }

  const stats = [
    { label: 'Konsultacje', value: consultations.length, icon: Assignment, color: '#007AFF' },
    { label: 'Wyniki badań', value: labResults.length, icon: Science, color: '#34C759' },
    { label: 'Zdjęcia', value: scalpPhotos.length, icon: PhotoCamera, color: '#FF9500' },
    { label: 'Plany opieki', value: carePlans.length, icon: LocalHospital, color: '#FF3B30' },
  ];

  return (
    <Box sx={{
      bgcolor: '#f5f5f7',
      minHeight: '100vh',
      pb: 6,
    }}>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/patients')}
          sx={{
            mb: 3,
            color: '#1d1d1f',
            '&:hover': {
              bgcolor: alpha('#000', 0.05),
            },
          }}
        >
          Powrót do listy pacjentów
        </Button>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 4, borderRadius: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Header Card */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: 3,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, md: 4 }, mb: 4 }}>
            <Avatar
              sx={{
                bgcolor: '#007AFF',
                width: { xs: 64, md: 96 },
                height: { xs: 64, md: 96 },
                fontSize: { xs: '1.5rem', md: '2.5rem' },
                fontWeight: 600,
              }}
            >
              {getInitials(patient.firstName, patient.lastName)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: '#1d1d1f',
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  lineHeight: 1.2,
                }}
              >
                {patient.firstName} {patient.lastName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                {patient.age && (
                  <Chip
                    icon={<CalendarToday sx={{ fontSize: 16 }} />}
                    label={`${patient.age} lat`}
                    sx={{
                      bgcolor: alpha('#007AFF', 0.1),
                      color: '#007AFF',
                      border: 'none',
                      fontWeight: 500,
                    }}
                  />
                )}
                {patient.gender && (
                  <Chip
                    label={patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}
                    sx={{
                      bgcolor: alpha('#34C759', 0.1),
                      color: '#34C759',
                      border: 'none',
                      fontWeight: 500,
                      height: 32,
                      fontSize: '0.9rem',
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate(`/patients/${id}/consultations/new`)}
              sx={{
                bgcolor: '#007AFF',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#0051D5',
                  boxShadow: 'none',
                },
              }}
            >
              Nowa konsultacja
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/patients/${id}/edit`)}
              sx={{
                borderColor: '#d2d2d7',
                color: '#1d1d1f',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#1d1d1f',
                  bgcolor: alpha('#000', 0.02),
                },
              }}
            >
              Edytuj dane
            </Button>
            {patient.email && (
              <Button
                variant="outlined"
                startIcon={<Email />}
                onClick={() => navigate(`/patients/${id}/email`)}
                sx={{
                  borderColor: '#d2d2d7',
                  color: '#1d1d1f',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#1d1d1f',
                    bgcolor: alpha('#000', 0.02),
                  },
                }}
              >
                Wyślij email
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid key={index} size={{ xs: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 3,
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: stat.color,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: alpha(stat.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <stat.icon sx={{ color: stat.color, fontSize: 20 }} />
                  </Box>
                </Box>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    color: '#1d1d1f',
                    mb: 1,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#86868b',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: 'white',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                color: '#86868b',
                minHeight: 64,
                '&.Mui-selected': {
                  color: '#1d1d1f',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: '#007AFF',
              },
            }}
          >
            <Tab label="Przegląd" />
            <Tab label="Konsultacje" />
            <Tab label="Wyniki badań" />
            <Tab label="Zdjęcia" />
            <Tab label="Plany opieki" />
          </Tabs>

          {/* Tab Panel 0: Overview */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Contact Information */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#1d1d1f',
                      mb: 3,
                    }}
                  >
                    Informacje kontaktowe
                  </Typography>
                  <Stack spacing={4}>
                    {patient.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: alpha('#007AFF', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Phone sx={{ color: '#007AFF', fontSize: 24 }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 500, fontSize: '0.8rem', mb: 0.5, display: 'block' }}>
                            Telefon
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1d1d1f', fontSize: '1.1rem' }}>
                            {patient.phone}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    {patient.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: alpha('#34C759', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Email sx={{ color: '#34C759', fontSize: 24 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 500, fontSize: '0.8rem', mb: 0.5, display: 'block' }}>
                            Email
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              color: '#1d1d1f',
                              fontSize: '1.1rem',
                              wordBreak: 'break-word',
                            }}
                          >
                            {patient.email}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    {patient.address && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: alpha('#FF9500', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <LocationOn sx={{ color: '#FF9500', fontSize: 24 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 500, fontSize: '0.8rem', mb: 0.5, display: 'block' }}>
                            Adres
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              color: '#1d1d1f',
                              fontSize: '1.1rem',
                              wordBreak: 'break-word',
                            }}
                          >
                            {patient.address}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Grid>

              {/* Additional Information */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#1d1d1f',
                      mb: 3,
                    }}
                  >
                    Dodatkowe informacje
                  </Typography>
                  <Stack spacing={4}>
                    {patient.occupation && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: alpha('#FF3B30', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Work sx={{ color: '#FF3B30', fontSize: 24 }} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 500, fontSize: '0.8rem', mb: 0.5, display: 'block' }}>
                            Zawód
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1d1d1f', fontSize: '1.1rem' }}>
                            {patient.occupation}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab Panel 1: Consultations */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/consultations/new`)}
                sx={{
                  bgcolor: '#007AFF',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#0051D5',
                    boxShadow: 'none',
                  },
                }}
              >
                Nowa konsultacja
              </Button>
              <Button
                variant={showArchived.consultations ? 'contained' : 'outlined'}
                startIcon={<Archive />}
                onClick={() => {
                  setShowArchived(prev => ({ ...prev, consultations: !prev.consultations }));
                }}
                sx={{
                  borderColor: '#d2d2d7',
                  color: showArchived.consultations ? 'white' : '#1d1d1f',
                  bgcolor: showArchived.consultations ? '#007AFF' : 'transparent',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#1d1d1f',
                    bgcolor: showArchived.consultations ? '#0051D5' : alpha('#000', 0.02),
                    boxShadow: 'none',
                  },
                }}
              >
                {showArchived.consultations ? 'Pokaż aktywne' : 'Pokaż zarchiwizowane'}
              </Button>
            </Box>
            {consultations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Assignment sx={{ fontSize: 64, color: '#d2d2d7', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#86868b', fontWeight: 500 }}>
                  Brak konsultacji
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {consultations.map((consultation) => (
                  <Paper
                    key={consultation.id}
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#007AFF',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1d1d1f', mb: 1, fontSize: '1.15rem' }}>
                          {new Date(consultation.consultationDate).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Typography>
                        {consultation.diagnosis && (
                          <Typography variant="body2" sx={{ color: '#86868b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            {consultation.diagnosis}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/consultations/${consultation.id}`)}
                          sx={{
                            borderColor: '#d2d2d7',
                            color: '#1d1d1f',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            '&:hover': {
                              borderColor: '#1d1d1f',
                              bgcolor: alpha('#000', 0.02),
                            },
                          }}
                        >
                          Zobacz
                        </Button>
                        {patient.email && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Email />}
                            onClick={() => handleSendEmail('consultation', consultation.id, 'Konsultacja')}
                            disabled={loading}
                            sx={{
                              bgcolor: '#007AFF',
                              color: 'white',
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: 1.5,
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: '#0051D5',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            Wyślij
                          </Button>
                        )}
                        {showArchived.consultations ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleRestoreClick('consultation', consultation.id, 'Konsultacja')}
                              sx={{ color: '#34C759' }}
                            >
                              <Restore />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handlePermanentDeleteClick('consultation', consultation.id, 'Konsultacja')}
                              sx={{ color: '#FF3B30' }}
                            >
                              <DeleteForever />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick('consultation', consultation.id, 'Konsultacja')}
                            sx={{ color: '#FF3B30' }}
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </TabPanel>

          {/* Tab Panel 2: Lab Results */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/lab-results/new`)}
                sx={{
                  bgcolor: '#007AFF',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#0051D5',
                    boxShadow: 'none',
                  },
                }}
              >
                Nowy wynik badania
              </Button>
              <Button
                variant={showArchived.labResults ? 'contained' : 'outlined'}
                startIcon={<Archive />}
                onClick={() => {
                  setShowArchived(prev => ({ ...prev, labResults: !prev.labResults }));
                }}
                sx={{
                  borderColor: '#d2d2d7',
                  color: showArchived.labResults ? 'white' : '#1d1d1f',
                  bgcolor: showArchived.labResults ? '#007AFF' : 'transparent',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#1d1d1f',
                    bgcolor: showArchived.labResults ? '#0051D5' : alpha('#000', 0.02),
                    boxShadow: 'none',
                  },
                }}
              >
                {showArchived.labResults ? 'Pokaż aktywne' : 'Pokaż zarchiwizowane'}
              </Button>
            </Box>
            {labResults.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Science sx={{ fontSize: 64, color: '#d2d2d7', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#86868b', fontWeight: 500 }}>
                  Brak wyników badań
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {labResults.map((result) => (
                  <Paper
                    key={result.id}
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#34C759',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1d1d1f', mb: 1 }}>
                          {result.testName || 'Wynik badania'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#86868b' }}>
                          {new Date(result.testDate).toLocaleDateString('pl-PL')}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {patient.email && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Email />}
                            onClick={() => handleSendEmail('labResult', result.id, 'Wynik badania')}
                            disabled={loading}
                            sx={{
                              bgcolor: '#007AFF',
                              color: 'white',
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: 1.5,
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: '#0051D5',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            Wyślij
                          </Button>
                        )}
                        {showArchived.labResults ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleRestoreClick('labResult', result.id, 'Wynik badania')}
                              sx={{ color: '#34C759' }}
                            >
                              <Restore />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handlePermanentDeleteClick('labResult', result.id, 'Wynik badania')}
                              sx={{ color: '#FF3B30' }}
                            >
                              <DeleteForever />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick('labResult', result.id, 'Wynik badania')}
                            sx={{ color: '#FF3B30' }}
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </TabPanel>

          {/* Tab Panel 3: Photos */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/scalp-photos/new`)}
                sx={{
                  bgcolor: '#007AFF',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#0051D5',
                    boxShadow: 'none',
                  },
                }}
              >
                Dodaj zdjęcie
              </Button>
            </Box>
            {scalpPhotos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <PhotoCamera sx={{ fontSize: 64, color: '#d2d2d7', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#86868b', fontWeight: 500 }}>
                  Brak zdjęć
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {scalpPhotos.map((photo) => (
                  <Grid key={photo.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: '#FF9500',
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: 200,
                          bgcolor: '#f5f5f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {photo.photoUrl ? (
                          <img
                            src={photo.photoUrl}
                            alt="Zdjęcie skóry głowy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <PhotoCamera sx={{ fontSize: 48, color: '#d2d2d7' }} />
                        )}
                      </Box>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2" sx={{ color: '#86868b', mb: 1 }}>
                          {new Date(photo.photoDate).toLocaleDateString('pl-PL')}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/scalp-photos/${photo.id}`)}
                            sx={{
                              borderColor: '#d2d2d7',
                              color: '#1d1d1f',
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: 1.5,
                              flex: 1,
                              '&:hover': {
                                borderColor: '#1d1d1f',
                                bgcolor: alpha('#000', 0.02),
                              },
                            }}
                          >
                            Zobacz
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick('scalpPhoto', photo.id, 'Zdjęcie')}
                            sx={{ color: '#FF3B30' }}
                          >
                            <Delete />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          {/* Tab Panel 4: Care Plans */}
          <TabPanel value={tabValue} index={4}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/care-plans/new`)}
                sx={{
                  bgcolor: '#007AFF',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#0051D5',
                    boxShadow: 'none',
                  },
                }}
              >
                Nowy plan opieki
              </Button>
              <Button
                variant={showArchived.carePlans ? 'contained' : 'outlined'}
                startIcon={<Archive />}
                onClick={() => {
                  setShowArchived(prev => ({ ...prev, carePlans: !prev.carePlans }));
                }}
                sx={{
                  borderColor: '#d2d2d7',
                  color: showArchived.carePlans ? 'white' : '#1d1d1f',
                  bgcolor: showArchived.carePlans ? '#007AFF' : 'transparent',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#1d1d1f',
                    bgcolor: showArchived.carePlans ? '#0051D5' : alpha('#000', 0.02),
                    boxShadow: 'none',
                  },
                }}
              >
                {showArchived.carePlans ? 'Pokaż aktywne' : 'Pokaż zarchiwizowane'}
              </Button>
            </Box>
            {carePlans.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <LocalHospital sx={{ fontSize: 64, color: '#d2d2d7', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#86868b', fontWeight: 500 }}>
                  Brak planów opieki
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {carePlans.map((plan) => (
                  <Paper
                    key={plan.id}
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#FF3B30',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1d1d1f', mb: 1 }}>
                          {plan.title || 'Plan opieki'}
                        </Typography>
                        {plan.description && (
                          <Typography variant="body2" sx={{ color: '#86868b' }}>
                            {plan.description}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/care-plans/${plan.id}`)}
                          sx={{
                            borderColor: '#d2d2d7',
                            color: '#1d1d1f',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            '&:hover': {
                              borderColor: '#1d1d1f',
                              bgcolor: alpha('#000', 0.02),
                            },
                          }}
                        >
                          Zobacz
                        </Button>
                        {patient.email && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Email />}
                            onClick={() => handleSendEmail('carePlan', plan.id, 'Plan opieki')}
                            disabled={loading}
                            sx={{
                              bgcolor: '#007AFF',
                              color: 'white',
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: 1.5,
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: '#0051D5',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            Wyślij
                          </Button>
                        )}
                        {showArchived.carePlans ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleRestoreClick('carePlan', plan.id, 'Plan opieki')}
                              sx={{ color: '#34C759' }}
                            >
                              <Restore />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handlePermanentDeleteClick('carePlan', plan.id, 'Plan opieki')}
                              sx={{ color: '#FF3B30' }}
                            >
                              <DeleteForever />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick('carePlan', plan.id, 'Plan opieki')}
                            sx={{ color: '#FF3B30' }}
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </TabPanel>
        </Paper>
      </Container>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1d1d1f' }}>
          Potwierdź usunięcie
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#86868b' }}>
            Czy na pewno chcesz usunąć: {deleteDialog.name}?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              color: '#1d1d1f',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            sx={{
              bgcolor: '#FF3B30',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#D70015',
                boxShadow: 'none',
              },
            }}
          >
            Usuń
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={restoreDialog.open}
        onClose={() => setRestoreDialog({ open: false, type: null, id: null, name: '' })}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1d1d1f' }}>
          Potwierdź przywrócenie
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#86868b' }}>
            Czy na pewno chcesz przywrócić: {restoreDialog.name}?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setRestoreDialog({ open: false, type: null, id: null, name: '' })}
            sx={{
              color: '#1d1d1f',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleRestoreConfirm}
            variant="contained"
            sx={{
              bgcolor: '#34C759',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#248A3D',
                boxShadow: 'none',
              },
            }}
          >
            Przywróć
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog
        open={permanentDeleteDialog.open}
        onClose={() => setPermanentDeleteDialog({ open: false, type: null, id: null, name: '' })}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#FF3B30' }}>
          Trwałe usunięcie
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#86868b' }}>
            UWAGA: Ta operacja jest nieodwracalna. Czy na pewno chcesz trwale usunąć: {permanentDeleteDialog.name}?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setPermanentDeleteDialog({ open: false, type: null, id: null, name: '' })}
            sx={{
              color: '#1d1d1f',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Anuluj
          </Button>
          <Button
            onClick={handlePermanentDeleteConfirm}
            variant="contained"
            sx={{
              bgcolor: '#FF3B30',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#D70015',
                boxShadow: 'none',
              },
            }}
          >
            Usuń trwale
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
