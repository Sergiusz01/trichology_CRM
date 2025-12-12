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
  Card,
  CardContent,
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
  useMediaQuery,
  useTheme,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Email,
  History,
  Assignment,
  Science,
  PhotoCamera,
  LocalHospital,
  Person,
  ArrowBack,
  Restore,
  DeleteForever,
  Archive,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
      {value === index && <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>{children}</Box>}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
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
      
      // Fetch consultations
      const consultationsResponse = await api.get(`/consultations/patient/${id}`, {
        params: { archived: showArchived.consultations ? 'true' : 'false' },
      });
      setConsultations(consultationsResponse.data.consultations || []);
      
      // Fetch lab results
      const labResultsResponse = await api.get(`/lab-results/patient/${id}`, {
        params: { archived: showArchived.labResults ? 'true' : 'false' },
      });
      setLabResults(labResultsResponse.data.labResults || []);
      
      // Fetch care plans
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
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!patient) {
    return (
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
        <Alert severity="error">Pacjent nie znaleziony</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/patients')}
          sx={{ mb: 2 }}
          size="small"
        >
          {isMobile ? 'Powrót' : 'Powrót do listy'}
        </Button>

        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: { xs: 2, sm: 3 },
          gap: 2,
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1.5, sm: 2 }, 
            flex: 1, 
            minWidth: 0,
            width: { xs: '100%', sm: 'auto' },
          }}>
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main', 
                width: { xs: 40, sm: 56, md: 64 }, 
                height: { xs: 40, sm: 56, md: 64 },
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {getInitials(patient.firstName, patient.lastName)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Typography 
                variant={isMobile ? 'h6' : 'h4'} 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' },
                }}
                noWrap={false}
              >
                {patient.firstName} {patient.lastName}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                {patient.age && (
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    {patient.age} lat
                  </Typography>
                )}
                {patient.gender && (
                  <>
                    {patient.age && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        {' '}•{' '}
                      </Typography>
                    )}
                    <Chip
                      label={patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}
                      size="small"
                      color={patient.gender === 'MALE' ? 'primary' : 'secondary'}
                      sx={{ height: { xs: 20, sm: 24 }, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                    />
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* Action Buttons - Mobile: Column, Desktop: Row */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1}
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              '& > *': { 
                width: { xs: '100%', sm: 'auto' },
                minWidth: { xs: 'auto', sm: '100px' },
              },
            }}
          >
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/patients/${id}/edit`)}
              size="small"
              fullWidth={isMobile}
            >
              Edytuj
            </Button>
            {patient.email && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Email />}
                  onClick={() => navigate(`/patients/${id}/email`)}
                  size="small"
                  fullWidth={isMobile}
                >
                  {isMobile ? 'Email' : 'Wyślij email'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<History />}
                  onClick={() => navigate(`/patients/${id}/email-history`)}
                  size="small"
                  fullWidth={isMobile}
                >
                  {isMobile ? 'Historia' : 'Historia emaili'}
                </Button>
              </>
            )}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate(`/patients/${id}/consultations/new`)}
              size="small"
              fullWidth={isMobile}
            >
              {isMobile ? 'Konsultacja' : 'Nowa konsultacja'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => handleDeleteClick('patient', id!, `${patient.firstName} ${patient.lastName}`)}
              size="small"
              fullWidth={isMobile}
            >
              Usuń
            </Button>
          </Stack>
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

        <Paper sx={{ overflow: 'hidden', width: '100%' }}>
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider', 
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            <Tabs 
              value={tabValue} 
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: { xs: 48, sm: 64 },
                '& .MuiTab-root': {
                  minHeight: { xs: 48, sm: 64 },
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  textTransform: 'none',
                  fontWeight: 500,
                  px: { xs: 1, sm: 2 },
                  minWidth: { xs: 72, sm: 100 },
                },
                '& .MuiTabs-scrollButtons': {
                  width: { xs: 32, sm: 40 },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                },
              }}
            >
              <Tab 
                label="Przegląd" 
                icon={isMobile ? <Person fontSize="small" /> : undefined} 
                iconPosition="start"
                sx={{ 
                  '&.Mui-selected': {
                    fontWeight: 600,
                  },
                }}
              />
              <Tab 
                label={isMobile ? 'Konsultacje' : 'Konsultacje'} 
                icon={<Assignment fontSize={isMobile ? 'small' : 'medium'} />} 
                iconPosition="start"
                sx={{ 
                  '&.Mui-selected': {
                    fontWeight: 600,
                  },
                }}
              />
              <Tab 
                label={isMobile ? 'Wyniki' : 'Wyniki badań'} 
                icon={<Science fontSize={isMobile ? 'small' : 'medium'} />} 
                iconPosition="start"
                sx={{ 
                  '&.Mui-selected': {
                    fontWeight: 600,
                  },
                }}
              />
              <Tab 
                label="Zdjęcia" 
                icon={<PhotoCamera fontSize={isMobile ? 'small' : 'medium'} />} 
                iconPosition="start"
                sx={{ 
                  '&.Mui-selected': {
                    fontWeight: 600,
                  },
                }}
              />
              <Tab 
                label={isMobile ? 'Plany' : 'Plany opieki'} 
                icon={<LocalHospital fontSize={isMobile ? 'small' : 'medium'} />} 
                iconPosition="start"
                sx={{ 
                  '&.Mui-selected': {
                    fontWeight: 600,
                  },
                }}
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        mb: 1.5,
                      }}
                    >
                      Dane osobowe
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                            mb: 0.5,
                            fontWeight: 500,
                          }}
                        >
                          Imię
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                          }}
                        >
                          {patient.firstName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                            mb: 0.5,
                            fontWeight: 500,
                          }}
                        >
                          Nazwisko
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                          }}
                        >
                          {patient.lastName}
                        </Typography>
                      </Box>
                      {patient.age && (
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                              mb: 0.5,
                              fontWeight: 500,
                            }}
                          >
                            Wiek
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {patient.age} lat
                          </Typography>
                        </Box>
                      )}
                      {patient.gender && (
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                              mb: 0.5,
                              fontWeight: 500,
                            }}
                          >
                            Płeć
                          </Typography>
                          <Chip
                            label={patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}
                            size="small"
                            color={patient.gender === 'MALE' ? 'primary' : 'secondary'}
                            sx={{ 
                              height: { xs: 22, sm: 24 },
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            }}
                          />
                        </Box>
                      )}
                      {patient.phone && (
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                              mb: 0.5,
                              fontWeight: 500,
                            }}
                          >
                            Telefon
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {patient.phone}
                          </Typography>
                        </Box>
                      )}
                      {patient.email && (
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                              mb: 0.5,
                              fontWeight: 500,
                            }}
                          >
                            Email
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              wordBreak: 'break-word',
                            }}
                          >
                            {patient.email}
                          </Typography>
                        </Box>
                      )}
                      {patient.occupation && (
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                              mb: 0.5,
                              fontWeight: 500,
                            }}
                          >
                            Zawód
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                            }}
                          >
                            {patient.occupation}
                          </Typography>
                        </Box>
                      )}
                      {patient.address && (
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                              mb: 0.5,
                              fontWeight: 500,
                            }}
                          >
                            Adres
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              wordBreak: 'break-word',
                            }}
                          >
                            {patient.address}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        mb: 1.5,
                      }}
                    >
                      Statystyki
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="body1"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          Konsultacje
                        </Typography>
                        <Chip 
                          label={consultations.length} 
                          color="primary"
                          size="small"
                          sx={{ 
                            height: { xs: 24, sm: 28 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="body1"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          Wyniki badań
                        </Typography>
                        <Chip 
                          label={labResults.length} 
                          color="secondary"
                          size="small"
                          sx={{ 
                            height: { xs: 24, sm: 28 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="body1"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          Zdjęcia
                        </Typography>
                        <Chip 
                          label={scalpPhotos.length} 
                          color="info"
                          size="small"
                          sx={{ 
                            height: { xs: 24, sm: 28 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="body1"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          Plany opieki
                        </Typography>
                        <Chip 
                          label={carePlans.length} 
                          color="success"
                          size="small"
                          sx={{ 
                            height: { xs: 24, sm: 28 },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          }}
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/consultations/new`)}
                fullWidth={isMobile}
                size="small"
              >
                Nowa konsultacja
              </Button>
              <Button
                variant={showArchived.consultations ? 'contained' : 'outlined'}
                startIcon={<Archive />}
                onClick={() => {
                  setShowArchived(prev => ({ ...prev, consultations: !prev.consultations }));
                }}
                size="small"
              >
                {showArchived.consultations ? 'Aktywne' : 'Zarchiwizowane'}
              </Button>
            </Box>
            {consultations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Assignment sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">Brak konsultacji</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {consultations.map((consultation) => (
                  <Card key={consultation.id}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '1rem', sm: '1.25rem' },
                            }}
                          >
                            {new Date(consultation.consultationDate).toLocaleDateString('pl-PL')}
                          </Typography>
                          {consultation.diagnosis && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                mt: 0.5,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                wordBreak: 'break-word',
                              }}
                            >
                              {consultation.diagnosis}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/consultations/${consultation.id}`)}
                            fullWidth={isMobile}
                          >
                            Zobacz
                          </Button>
                          {patient.email && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<Email />}
                              onClick={() =>
                                handleSendEmail(
                                  'consultation',
                                  consultation.id,
                                  'Konsultacja'
                                )
                              }
                              disabled={loading}
                              fullWidth={isMobile}
                            >
                              {isMobile ? 'Email' : 'Wyślij email'}
                            </Button>
                          )}
                          {showArchived.consultations ? (
                            <>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() =>
                                  handleRestoreClick(
                                    'consultation',
                                    consultation.id,
                                    new Date(consultation.consultationDate).toLocaleDateString('pl-PL')
                                  )
                                }
                                sx={{ flexShrink: 0 }}
                                title="Przywróć konsultację"
                              >
                                <Restore />
                              </IconButton>
                              {isAdmin && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handlePermanentDeleteClick(
                                      'consultation',
                                      consultation.id,
                                      new Date(consultation.consultationDate).toLocaleDateString('pl-PL')
                                    )
                                  }
                                  sx={{ flexShrink: 0 }}
                                  title="Trwale usuń (RODO)"
                                >
                                  <DeleteForever />
                                </IconButton>
                              )}
                            </>
                          ) : (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleDeleteClick(
                                  'consultation',
                                  consultation.id,
                                  new Date(consultation.consultationDate).toLocaleDateString('pl-PL')
                                )
                              }
                              sx={{ flexShrink: 0 }}
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/lab-results`)}
                fullWidth={isMobile}
                size="small"
              >
                Dodaj wynik
              </Button>
              <Button
                variant={showArchived.labResults ? 'contained' : 'outlined'}
                startIcon={<Archive />}
                onClick={() => {
                  setShowArchived(prev => ({ ...prev, labResults: !prev.labResults }));
                }}
                size="small"
              >
                {showArchived.labResults ? 'Aktywne' : 'Zarchiwizowane'}
              </Button>
            </Box>
            {labResults.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Science sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">Brak wyników badań</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {labResults.map((result) => (
                  <Card key={result.id}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '1rem', sm: '1.25rem' },
                            }}
                          >
                            {new Date(result.date).toLocaleDateString('pl-PL')}
                          </Typography>
                          {result.notes && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                mt: 0.5,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                wordBreak: 'break-word',
                              }}
                            >
                              {result.notes}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/patients/${id}/lab-results/${result.id}`)}
                            fullWidth={isMobile}
                          >
                            Zobacz
                          </Button>
                          {patient.email && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<Email />}
                              onClick={() =>
                                handleSendEmail(
                                  'labResult',
                                  result.id,
                                  'Wyniki badań'
                                )
                              }
                              disabled={loading}
                              fullWidth={isMobile}
                            >
                              {isMobile ? 'Email' : 'Wyślij email'}
                            </Button>
                          )}
                          {showArchived.labResults ? (
                            <>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() =>
                                  handleRestoreClick(
                                    'labResult',
                                    result.id,
                                    new Date(result.date).toLocaleDateString('pl-PL')
                                  )
                                }
                                sx={{ flexShrink: 0 }}
                                title="Przywróć wynik badania"
                              >
                                <Restore />
                              </IconButton>
                              {isAdmin && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handlePermanentDeleteClick(
                                      'labResult',
                                      result.id,
                                      new Date(result.date).toLocaleDateString('pl-PL')
                                    )
                                  }
                                  sx={{ flexShrink: 0 }}
                                  title="Trwale usuń (RODO)"
                                >
                                  <DeleteForever />
                                </IconButton>
                              )}
                            </>
                          ) : (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleDeleteClick(
                                  'labResult',
                                  result.id,
                                  new Date(result.date).toLocaleDateString('pl-PL')
                                )
                              }
                              sx={{ flexShrink: 0 }}
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/scalp-photos`)}
                fullWidth={isMobile}
                size="small"
              >
                Dodaj zdjęcie
              </Button>
            </Box>
            {scalpPhotos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PhotoCamera sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">Brak zdjęć</Typography>
              </Box>
            ) : (
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {scalpPhotos.map((photo) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 4 },
                        transition: 'box-shadow 0.2s',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      onClick={() => navigate(`/patients/${id}/scalp-photos/${photo.id}`)}
                    >
                      <Box sx={{ position: 'relative', flex: 1, minHeight: { xs: 180, sm: 200 } }}>
                        <Box
                          component="img"
                          src={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'}${photo.url || `/uploads/${photo.filePath?.split(/[/\\]/).pop()}`}`}
                          alt={photo.originalFilename || 'Zdjęcie skóry głowy'}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            imageOrientation: 'from-image',
                            backgroundColor: '#f5f5f5',
                          }}
                          onLoad={() => {
                            console.log('Obraz załadowany:', photo.url);
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            console.error('Błąd ładowania obrazu:', {
                              url: photo.url,
                              filePath: photo.filePath,
                              fullUrl: img.src,
                              photo: photo
                            });
                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EBrak zdj%26%23381%3Bcia%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 1)',
                            },
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick('scalpPhoto', photo.id, photo.originalFilename);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, flexGrow: 0 }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            mb: photo.notes ? 0.5 : 0,
                          }}
                        >
                          {new Date(photo.createdAt).toLocaleDateString('pl-PL')}
                        </Typography>
                        {photo.notes && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mt: 0.5,
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              wordBreak: 'break-word',
                            }}
                            noWrap={false}
                          >
                            {photo.notes}
                          </Typography>
                        )}
                        {patient.email && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<Email />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmail('scalpPhoto', photo.id, 'Zdjęcie');
                            }}
                            disabled={loading}
                            fullWidth
                            sx={{ mt: 1 }}
                          >
                            Wyślij email
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/care-plans/new`)}
                fullWidth={isMobile}
                size="small"
              >
                Nowy plan opieki
              </Button>
              <Button
                variant={showArchived.carePlans ? 'contained' : 'outlined'}
                startIcon={<Archive />}
                onClick={() => {
                  setShowArchived(prev => ({ ...prev, carePlans: !prev.carePlans }));
                }}
                size="small"
              >
                {showArchived.carePlans ? 'Aktywne' : 'Zarchiwizowane'}
              </Button>
            </Box>
            {carePlans.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <LocalHospital sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">Brak planów opieki</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {carePlans.map((plan) => (
                  <Card key={plan.id}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '1rem', sm: '1.25rem' },
                            }}
                          >
                            {plan.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              mt: 0.5,
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            }}
                          >
                            {plan.totalDurationWeeks} tygodni
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/patients/${id}/care-plans/${plan.id}`)}
                            fullWidth={isMobile}
                          >
                            Zobacz
                          </Button>
                          {patient.email && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<Email />}
                              onClick={() =>
                                handleSendEmail(
                                  'carePlan',
                                  plan.id,
                                  'Plan opieki'
                                )
                              }
                              disabled={loading}
                              fullWidth={isMobile}
                            >
                              {isMobile ? 'Email' : 'Wyślij email'}
                            </Button>
                          )}
                          {showArchived.carePlans ? (
                            <>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleRestoreClick('carePlan', plan.id, plan.title)}
                                sx={{ flexShrink: 0 }}
                                title="Przywróć plan opieki"
                              >
                                <Restore />
                              </IconButton>
                              {isAdmin && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handlePermanentDeleteClick('carePlan', plan.id, plan.title)}
                                  sx={{ flexShrink: 0 }}
                                  title="Trwale usuń (RODO)"
                                >
                                  <DeleteForever />
                                </IconButton>
                              )}
                            </>
                          ) : (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick('carePlan', plan.id, plan.title)}
                              sx={{ flexShrink: 0 }}
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </TabPanel>
        </Paper>

        <Dialog 
          open={deleteDialog.open} 
          onClose={handleDeleteCancel} 
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
            {deleteDialog.type === 'patient' ? 'Zarchiwizuj pacjenta' : deleteDialog.type === 'scalpPhoto' ? 'Trwałe usunięcie (RODO)' : 'Zarchiwizuj'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {deleteDialog.type === 'scalpPhoto' && (
                <>
                  <strong>UWAGA: Ta operacja jest nieodwracalna i zgodna z RODO!</strong>
                  <br /><br />
                </>
              )}
              Czy na pewno chcesz{' '}
              {deleteDialog.type === 'patient' && 'zarchiwizować pacjenta'}
              {deleteDialog.type === 'consultation' && 'zarchiwizować konsultację'}
              {deleteDialog.type === 'labResult' && 'zarchiwizować wynik badania'}
              {deleteDialog.type === 'scalpPhoto' && 'trwale usunąć zdjęcie'}
              {deleteDialog.type === 'carePlan' && 'zarchiwizować plan opieki'}{' '}
              <strong>{deleteDialog.name}</strong>?
              {deleteDialog.type === 'patient' && (
                <Typography 
                  variant="body2" 
                  color="warning.main" 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'warning.50', 
                    borderRadius: 1,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  ⚠️ Uwaga: Pacjent zostanie zarchiwizowany (soft delete). Wszystkie powiązane dane pozostaną w systemie.
                </Typography>
              )}
              {deleteDialog.type === 'consultation' && (
                <Typography 
                  variant="body2" 
                  color="warning.main" 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'warning.50', 
                    borderRadius: 1,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  ⚠️ Konsultacja zostanie zarchiwizowana (soft delete). Możesz ją później przywrócić.
                </Typography>
              )}
              {deleteDialog.type === 'labResult' && (
                <Typography 
                  variant="body2" 
                  color="warning.main" 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'warning.50', 
                    borderRadius: 1,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  ⚠️ Wynik badania zostanie zarchiwizowany (soft delete). Możesz go później przywrócić.
                </Typography>
              )}
              {deleteDialog.type === 'carePlan' && (
                <Typography 
                  variant="body2" 
                  color="warning.main" 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'warning.50', 
                    borderRadius: 1,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  ⚠️ Plan opieki zostanie zarchiwizowany (soft delete). Możesz go później przywrócić.
                </Typography>
              )}
              {deleteDialog.type === 'scalpPhoto' && (
                <Typography 
                  variant="body2" 
                  color="error.main" 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'error.50', 
                    borderRadius: 1,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  ⚠️ Zdjęcie i wszystkie adnotacje zostaną trwale usunięte. 
                  Plik zdjęcia również zostanie usunięty z serwera. Ta operacja jest nieodwracalna i zgodna z RODO.
                </Typography>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            <Button 
              onClick={handleDeleteCancel}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color={deleteDialog.type === 'scalpPhoto' ? 'error' : 'error'} 
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
            >
              {deleteDialog.type === 'scalpPhoto' ? 'Trwale usuń' : 'Zarchiwizuj'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={restoreDialog.open} 
          onClose={() => setRestoreDialog({ open: false, type: null, id: null, name: '' })} 
          fullWidth 
          maxWidth="sm"
        >
          <DialogTitle>Przywróć {restoreDialog.type === 'consultation' ? 'konsultację' : restoreDialog.type === 'labResult' ? 'wynik badania' : 'plan opieki'}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Czy na pewno chcesz przywrócić{' '}
              {restoreDialog.type === 'consultation' && 'konsultację'}
              {restoreDialog.type === 'labResult' && 'wynik badania'}
              {restoreDialog.type === 'carePlan' && 'plan opieki'}{' '}
              <strong>{restoreDialog.name}</strong>?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRestoreDialog({ open: false, type: null, id: null, name: '' })}>Anuluj</Button>
            <Button onClick={handleRestoreConfirm} color="success" variant="contained">Przywróć</Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={permanentDeleteDialog.open} 
          onClose={() => setPermanentDeleteDialog({ open: false, type: null, id: null, name: '' })} 
          fullWidth 
          maxWidth="sm"
        >
          <DialogTitle>Trwałe usunięcie (RODO)</DialogTitle>
          <DialogContent>
            <DialogContentText>
              <strong>UWAGA: Ta operacja jest nieodwracalna!</strong>
              <br /><br />
              Czy na pewno chcesz trwale usunąć{' '}
              {permanentDeleteDialog.type === 'consultation' && 'konsultację'}
              {permanentDeleteDialog.type === 'labResult' && 'wynik badania'}
              {permanentDeleteDialog.type === 'carePlan' && 'plan opieki'}{' '}
              <strong>{permanentDeleteDialog.name}</strong> zgodnie z RODO?
              <br /><br />
              Ta operacja jest zgodna z RODO i nie może być cofnięta.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPermanentDeleteDialog({ open: false, type: null, id: null, name: '' })}>Anuluj</Button>
            <Button onClick={handlePermanentDeleteConfirm} color="error" variant="contained">Trwale usuń</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
