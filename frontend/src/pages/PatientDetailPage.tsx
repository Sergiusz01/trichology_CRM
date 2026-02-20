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
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Tooltip,
  CardMedia,
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
  EventAvailable,
  Notifications,
  Send,
  GetApp,
  Visibility
} from '@mui/icons-material';
import { api, BASE_URL } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { ErrorRetry } from '../components/ErrorRetry';

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

interface Visit {
  id: string;
  patientId: string;
  data: string;
  rodzajZabiegu: string;
  notatki?: string;
  status: 'ZAPLANOWANA' | 'ODBYTA' | 'NIEOBECNOSC' | 'ANULOWANA';
  numerWSerii?: number;
  liczbaSerii?: number;
  cena?: number;
}

import { VISIT_STATUS_CONFIG } from '../constants/visitStatus';

// Helper function to format date for datetime-local input
// Backend stores dates as UTC but representing the exact hour/minute entered
// We need to extract UTC hours/minutes to preserve the exact time
const formatDateTimeLocal = (dateString: string): string => {
  const date = new Date(dateString);
  // Use UTC methods to get the exact hour/minute that was stored
  // This preserves the time the user originally entered
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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
  const { success: showSuccess, error: showError } = useNotification();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [scalpPhotos, setScalpPhotos] = useState<any[]>([]);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitDialog, setVisitDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    id: string | null;
    data: string;
    rodzajZabiegu: string;
    notatki: string;
    status: 'ZAPLANOWANA' | 'ODBYTA' | 'NIEOBECNOSC' | 'ANULOWANA';
    numerWSerii: string;
    liczbaSerii: string;
    cena: string;
  }>({
    open: false,
    mode: 'add',
    id: null,
    data: '',
    rodzajZabiegu: '',
    notatki: '',
    status: 'ZAPLANOWANA',
    numerWSerii: '',
    liczbaSerii: '',
    cena: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan' | 'visit' | null;
    id: string | null;
    name: string;
  }>({ open: false, type: null, id: null, name: '' });
  const [reminderDialog, setReminderDialog] = useState<{
    open: boolean;
    visitId: string | null;
    visitData: string;
    rodzajZabiegu: string;
    customMessage: string;
    recipientEmail: string;
  }>({
    open: false,
    visitId: null,
    visitData: '',
    rodzajZabiegu: '',
    customMessage: '',
    recipientEmail: '',
  });
  const [sendingReminder, setSendingReminder] = useState(false);
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
  const [loadError, setLoadError] = useState<string | null>(null);

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
      setLoadError(null);
      const response = await api.get(`/patients/${id}`, { _skipErrorToast: true });
      setPatient(response.data.patient);
      setScalpPhotos(response.data.patient.scalpPhotos || []);

      const consultationsResponse = await api.get(`/consultations/patient/${id}`, {
        params: { archived: showArchived.consultations ? 'true' : 'false' },
        _skipErrorToast: true,
      });
      setConsultations(consultationsResponse.data.consultations || []);

      const labResultsResponse = await api.get(`/lab-results/patient/${id}`, {
        params: { archived: showArchived.labResults ? 'true' : 'false' },
        _skipErrorToast: true,
      });
      setLabResults(labResultsResponse.data.labResults || []);

      const carePlansResponse = await api.get(`/care-plans/patient/${id}`, {
        params: { archived: showArchived.carePlans ? 'true' : 'false' },
        _skipErrorToast: true,
      });
      setCarePlans(carePlansResponse.data.carePlans || []);

      const visitsResponse = await api.get(`/visits/patient/${id}`, { _skipErrorToast: true });
      setVisits(visitsResponse.data.visits || []);
    } catch (error: any) {
      console.error('Błąd pobierania pacjenta:', error);
      setLoadError(error.response?.data?.error || 'Nie udało się załadować danych pacjenta');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (
    type: 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan' | 'visit',
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
          showSuccess('Pacjent został zarchiwizowany');
          setTimeout(() => navigate('/patients'), 1500);
          break;
        case 'consultation':
          await api.delete(`/consultations/${deleteDialog.id}`);
          showSuccess('Konsultacja została zarchiwizowana');
          fetchPatient();
          break;
        case 'labResult':
          await api.delete(`/lab-results/${deleteDialog.id}`);
          showSuccess('Wynik badania został usunięty');
          fetchPatient();
          break;
        case 'scalpPhoto':
          await api.delete(`/scalp-photos/${deleteDialog.id}`);
          showSuccess('Zdjęcie zostało usunięte');
          fetchPatient();
          break;
        case 'carePlan':
          await api.delete(`/care-plans/${deleteDialog.id}`);
          showSuccess('Plan opieki został usunięty');
          fetchPatient();
          break;
        case 'visit':
          await api.delete(`/visits/${deleteDialog.id}`);
          showSuccess('Wizyta została usunięta');
          fetchPatient();
          break;
      }

      setDeleteDialog({ open: false, type: null, id: null, name: '' });
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas usuwania');
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
          showSuccess('Konsultacja została przywrócona');
          break;
        case 'labResult':
          await api.post(`/lab-results/${restoreDialog.id}/restore`);
          showSuccess('Wynik badania został przywrócony');
          break;
        case 'carePlan':
          await api.post(`/care-plans/${restoreDialog.id}/restore`);
          showSuccess('Plan opieki został przywrócony');
          break;
      }
      setRestoreDialog({ open: false, type: null, id: null, name: '' });
      fetchPatient();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas przywracania');
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
          showSuccess('Konsultacja została trwale usunięta zgodnie z RODO');
          break;
        case 'labResult':
          await api.delete(`/lab-results/${permanentDeleteDialog.id}/permanent`);
          showSuccess('Wynik badania został trwale usunięty zgodnie z RODO');
          break;
        case 'carePlan':
          await api.delete(`/care-plans/${permanentDeleteDialog.id}/permanent`);
          showSuccess('Plan opieki został trwale usunięty zgodnie z RODO');
          break;
      }
      setPermanentDeleteDialog({ open: false, type: null, id: null, name: '' });
      fetchPatient();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas trwałego usuwania');
    }
  };

  const handleSendVisitReminder = async () => {
    if (!reminderDialog.visitId) return;

    if (!reminderDialog.recipientEmail) {
      showError('Podaj adres email odbiorcy');
      return;
    }

    try {
      setSendingReminder(true);
      await api.post(`/visits/${reminderDialog.visitId}/reminder`, {
        recipientEmail: reminderDialog.recipientEmail,
        customMessage: reminderDialog.customMessage || undefined,
      });
      showSuccess('Przypomnienie wysłane pomyślnie!');
      setReminderDialog({
        open: false,
        visitId: null,
        visitData: '',
        rodzajZabiegu: '',
        customMessage: '',
        recipientEmail: '',
      });
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd wysyłania przypomnienia');
    } finally {
      setSendingReminder(false);
    }
  };

  const openReminderDialog = (visit: any) => {
    setReminderDialog({
      open: true,
      visitId: visit.id,
      visitData: visit.data,
      rodzajZabiegu: visit.rodzajZabiegu,
      customMessage: '',
      recipientEmail: patient?.email || '',
    });
  };

  const handleSendEmail = async (
    type: 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan',
    itemId: string,
    itemName: string
  ) => {
    if (!patient?.email) {
      showError('Pacjent nie ma zapisanego adresu email');
      return;
    }

    try {
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

      showSuccess(`${itemName} wysłane na email pacjenta`);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd wysyłania emaila');
    } finally {
      setLoading(false);
    }
  };

  const openAddVisitDialog = () => {
    // Set default date to now in local time format
    // Use local time for the default, but it will be stored as UTC preserving the hour/minute
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    setVisitDialog({
      open: true,
      mode: 'add',
      id: null,
      data: localDateTime,
      rodzajZabiegu: '',
      notatki: '',
      status: 'ZAPLANOWANA',
      numerWSerii: '',
      liczbaSerii: '',
      cena: '',
    });
  };

  const openEditVisitDialog = (visit: Visit) => {
    setVisitDialog({
      open: true,
      mode: 'edit',
      id: visit.id,
      data: formatDateTimeLocal(visit.data),
      rodzajZabiegu: visit.rodzajZabiegu,
      notatki: visit.notatki || '',
      status: visit.status,
      numerWSerii: visit.numerWSerii?.toString() || '',
      liczbaSerii: visit.liczbaSerii?.toString() || '',
      cena: visit.cena?.toString() || '',
    });
  };

  const handleVisitSubmit = async () => {
    if (!visitDialog.data || !visitDialog.rodzajZabiegu) {
      showError('Wypełnij wymagane pola: Data i Rodzaj zabiegu');
      return;
    }

    try {

      const visitData = {
        patientId: id,
        data: visitDialog.data,
        rodzajZabiegu: visitDialog.rodzajZabiegu,
        notatki: visitDialog.notatki || null,
        status: visitDialog.status,
        numerWSerii: visitDialog.numerWSerii ? parseInt(visitDialog.numerWSerii) : null,
        liczbaSerii: visitDialog.liczbaSerii ? parseInt(visitDialog.liczbaSerii) : null,
        cena: visitDialog.cena ? parseFloat(visitDialog.cena) : null,
      };

      if (visitDialog.mode === 'edit' && visitDialog.id) {
        await api.put(`/visits/${visitDialog.id}`, visitData);
        showSuccess('Wizyta została zaktualizowana');
      } else {
        await api.post('/visits', visitData);
        showSuccess('Wizyta została dodana');
      }

      setVisitDialog({
        open: false,
        mode: 'add',
        id: null,
        data: '',
        rodzajZabiegu: '',
        notatki: '',
        status: 'ZAPLANOWANA',
        numerWSerii: '',
        liczbaSerii: '',
        cena: '',
      });
      fetchPatient();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas zapisywania wizyty');
    }
  };

  const handleStatusChange = async (visitId: string, newStatus: string) => {
    try {
      await api.patch(`/visits/${visitId}/status`, { status: newStatus });
      showSuccess('Status wizyty został zmieniony');
      fetchPatient();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd zmiany statusu');
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

  if (!patient && !loading && loadError) {
    return (
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <ErrorRetry message={loadError} onRetry={fetchPatient} />
      </Container>
    );
  }

  if (!patient && !loading) {
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
    { label: 'Wizyty', value: visits.length, icon: EventAvailable, color: '#AF52DE' },
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

        {/* Loading Error with Retry */}
        {loadError && (
          <ErrorRetry message={loadError} onRetry={fetchPatient} onClose={() => setLoadError(null)} />
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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'center', md: 'flex-start' }, gap: { xs: 2.5, md: 4 }, mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
            <Avatar
              sx={{
                bgcolor: alpha('#007AFF', 0.1),
                color: '#007AFF',
                width: { xs: 80, md: 100 },
                height: { xs: 80, md: 100 },
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                fontWeight: 700,
                border: '2px solid',
                borderColor: alpha('#007AFF', 0.2),
              }}
            >
              {getInitials(patient.firstName, patient.lastName)}
            </Avatar>
            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: '#1d1d1f',
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.75rem' },
                  lineHeight: 1.2,
                }}
              >
                {patient.firstName} {patient.lastName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' }, alignItems: 'center' }}>
                {patient.age && (
                  <Chip
                    icon={<CalendarToday sx={{ fontSize: '14px !important' }} />}
                    label={`${patient.age} lat`}
                    size="small"
                    sx={{
                      bgcolor: alpha('#007AFF', 0.08),
                      color: '#007AFF',
                      border: 'none',
                      fontWeight: 600,
                      px: 0.5,
                    }}
                  />
                )}
                {patient.gender && (
                  <Chip
                    label={patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}
                    size="small"
                    sx={{
                      bgcolor: patient.gender === 'MALE' ? alpha('#007AFF', 0.08) : alpha('#FF2D55', 0.08),
                      color: patient.gender === 'MALE' ? '#007AFF' : '#FF2D55',
                      border: 'none',
                      fontWeight: 600,
                      px: 0.5,
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/consultations/new`)}
                sx={{
                  bgcolor: '#007AFF',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 700,
                  py: { xs: 1.2, sm: 1.5 },
                  borderRadius: 2.5,
                  boxShadow: `0 4px 14px ${alpha('#007AFF', 0.4)}`,
                  '&:hover': {
                    bgcolor: '#0051D5',
                    boxShadow: `0 6px 20px ${alpha('#007AFF', 0.5)}`,
                  },
                }}
              >
                Nowa konsultacja
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/patients/${id}/edit`)}
                sx={{
                  borderColor: alpha('#1d1d1f', 0.15),
                  color: '#1d1d1f',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: { xs: 1.2, sm: 1.5 },
                  borderRadius: 2.5,
                  '&:hover': {
                    borderColor: '#1d1d1f',
                    bgcolor: alpha('#000', 0.02),
                  },
                }}
              >
                Edytuj dane
              </Button>
            </Grid>
            {patient.email && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => navigate(`/patients/${id}/email`)}
                  sx={{
                    borderColor: alpha('#1d1d1f', 0.15),
                    color: '#1d1d1f',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: { xs: 1.2, sm: 1.5 },
                    borderRadius: 2.5,
                    '&:hover': {
                      borderColor: '#1d1d1f',
                      bgcolor: alpha('#000', 0.02),
                    },
                  }}
                >
                  Email
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => {
            const isActive = tabValue === (index + 1); // Stats correspond to tabs 1-4
            return (
              <Grid key={index} size={{ xs: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  onClick={() => setTabValue(index + 1)}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 4,
                    bgcolor: 'white',
                    border: '1px solid',
                    borderColor: isActive ? stat.color : 'divider',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? `0 8px 24px ${alpha(stat.color, 0.15)}` : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      borderColor: stat.color,
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 30px ${alpha(stat.color, 0.12)}`,
                    },
                    '&::before': isActive ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 4,
                      height: '100%',
                      bgcolor: stat.color
                    } : {}
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        bgcolor: alpha(stat.color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <stat.icon sx={{ color: stat.color, fontSize: 24 }} />
                    </Box>
                  </Box>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 800,
                      color: '#1d1d1f',
                      mb: 0.5,
                      fontSize: { xs: '1.75rem', md: '2.25rem' },
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#86868b',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
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
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              px: { xs: 1, sm: 2 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                color: '#86868b',
                minHeight: { xs: 56, sm: 64 },
                minWidth: { xs: 100, sm: 120 },
                '&.Mui-selected': {
                  color: '#007AFF',
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
            <Tab label="Wyniki" />
            <Tab label="Zdjęcia" />
            <Tab label="Plany" />
            <Tab label="Wizyty" />
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
                      <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/patients/${id}/lab-results/${result.id}`)}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1d1d1f', mb: 1, fontSize: '1.15rem' }}>
                          {result.testName || 'Wynik badania'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#86868b', fontSize: '0.95rem' }}>
                          {new Date(result.date || result.testDate).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/patients/${id}/lab-results/${result.id}`)}
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
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => navigate(`/patients/${id}/lab-results/${result.id}/edit`)}
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
                          Edytuj
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<GetApp />}
                          onClick={async () => {
                            try {
                              const response = await api.get(`/lab-results/${result.id}/pdf`, {
                                responseType: 'blob',
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `wynik-badan-${result.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                              showSuccess('PDF pobrany pomyślnie');
                            } catch (error: any) {
                              showError(error.response?.data?.error || 'Błąd pobierania PDF');
                            }
                          }}
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
                          PDF
                        </Button>
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
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          borderColor: '#FF9500',
                          transform: 'translateY(-4px)',
                          boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                        },
                      }}
                    >
                      <Box
                        onClick={() => navigate(`/scalp-photos/${photo.id}`)}
                        sx={{
                          width: '100%',
                          height: 200,
                          bgcolor: '#f5f5f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                      >
                        {photo.url || photo.filePath ? (
                          <CardMedia
                            component="img"
                            height="180"
                            image={photo.url ? `${photo.url}?token=${localStorage.getItem('accessToken')}` : (photo.filePath ? `/uploads/${photo.filePath.split(/[/\\]/).pop()}?token=${localStorage.getItem('accessToken')}` : '')}
                            alt={photo.originalFilename || 'Zdjęcie skóry głowy'}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.5s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              console.error('Błąd ładowania obrazu:', {
                                src: img.src,
                                photoUrl: photo.url,
                                filePath: photo.filePath
                              });
                              img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EBrak zdj%26%23381%3Bcia%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <PhotoCamera sx={{ fontSize: 48, color: '#d2d2d7' }} />
                        )}
                      </Box>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2" sx={{ color: '#86868b', mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday sx={{ fontSize: 14 }} />
                          {(() => {
                            const d = photo.date || photo.createdAt || photo.photoDate;
                            return d ? new Date(d).toLocaleDateString('pl-PL') : 'Brak daty';
                          })()}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            onClick={() => navigate(`/scalp-photos/${photo.id}`)}
                            sx={{
                              borderColor: '#d2d2d7',
                              color: '#1d1d1f',
                              textTransform: 'none',
                              fontWeight: 700,
                              borderRadius: 1.5,
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
                            sx={{
                              color: '#FF3B30',
                              bgcolor: alpha('#FF3B30', 0.05),
                              '&:hover': { bgcolor: alpha('#FF3B30', 0.1) }
                            }}
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
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/patients/${id}/care-plans/${plan.id}`)}
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
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => navigate(`/patients/${id}/care-plans/${plan.id}/edit`)}
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
                          Edytuj
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<GetApp />}
                          onClick={async () => {
                            try {
                              const response = await api.get(`/care-plans/${plan.id}/pdf`, {
                                responseType: 'blob',
                              });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', `plan-opieki-${plan.id}.pdf`);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                              showSuccess('PDF pobrany pomyślnie');
                            } catch (error: any) {
                              showError(error.response?.data?.error || 'Błąd pobierania PDF');
                            }
                          }}
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
                          PDF
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

          {/* Tab Panel 5: Visits */}
          <TabPanel value={tabValue} index={5}>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openAddVisitDialog}
                sx={{
                  bgcolor: '#AF52DE',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: '#9B30D9',
                    boxShadow: 'none',
                  },
                }}
              >
                Dodaj wizytę / zabieg
              </Button>
            </Box>
            {visits.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <EventAvailable sx={{ fontSize: 64, color: '#d2d2d7', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#86868b', fontWeight: 500 }}>
                  Brak wizyt i zabiegów
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#000', 0.02) }}>
                      <TableCell sx={{ fontWeight: 700, color: '#1d1d1f' }}>Data i godzina</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1d1d1f' }}>Rodzaj zabiegu</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1d1d1f' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1d1d1f' }}>Seria</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1d1d1f' }}>Cena</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1d1d1f' }}>Notatki</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#1d1d1f' }}>Akcje</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visits.map((visit) => {
                      const statusConfig = VISIT_STATUS_CONFIG[visit.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                      return (
                        <TableRow key={visit.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {(() => {
                                const date = new Date(visit.data);
                                return date.toLocaleDateString('pl-PL', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                });
                              })()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#86868b' }}>
                              {(() => {
                                const date = new Date(visit.data);
                                // Use UTC hours/minutes to preserve the exact time stored
                                const hours = String(date.getUTCHours()).padStart(2, '0');
                                const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                return `${hours}:${minutes}`;
                              })()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {visit.rodzajZabiegu}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 130 }}>
                              <Select
                                value={visit.status}
                                onChange={(e) => handleStatusChange(visit.id, e.target.value)}
                                sx={{
                                  bgcolor: statusConfig.bgColor,
                                  color: statusConfig.color,
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: statusConfig.color,
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: statusConfig.color,
                                  },
                                }}
                              >
                                <MenuItem value="ZAPLANOWANA">Zaplanowana</MenuItem>
                                <MenuItem value="ODBYTA">Odbyta</MenuItem>
                                <MenuItem value="NIEOBECNOSC">Nieobecność</MenuItem>
                                <MenuItem value="ANULOWANA">Anulowana</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            {visit.numerWSerii && visit.liczbaSerii ? (
                              <Chip
                                label={`${visit.numerWSerii} z ${visit.liczbaSerii}`}
                                size="small"
                                sx={{
                                  bgcolor: alpha('#007AFF', 0.1),
                                  color: '#007AFF',
                                  fontWeight: 600,
                                }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ color: '#86868b' }}>-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {visit.cena ? (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#34C759' }}>
                                {Number(visit.cena).toFixed(2)} zł
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ color: '#86868b' }}>-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {visit.notatki ? (
                              <Tooltip title={visit.notatki} arrow>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    maxWidth: 150,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: '#86868b',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {visit.notatki}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" sx={{ color: '#86868b' }}>-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              {visit.status === 'ZAPLANOWANA' && patient?.email && (
                                <Tooltip title="Wyślij przypomnienie">
                                  <IconButton
                                    size="small"
                                    onClick={() => openReminderDialog(visit)}
                                    sx={{ color: '#FF9500' }}
                                  >
                                    <Notifications fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <IconButton
                                size="small"
                                onClick={() => openEditVisitDialog(visit)}
                                sx={{ color: '#007AFF' }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick('visit', visit.id, visit.rodzajZabiegu)}
                                sx={{ color: '#FF3B30' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Paper>
      </Container>

      {/* Visit Dialog */}
      <Dialog
        open={visitDialog.open}
        onClose={() => setVisitDialog({ ...visitDialog, open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1d1d1f' }}>
          {visitDialog.mode === 'edit' ? 'Edytuj wizytę / zabieg' : 'Dodaj nową wizytę / zabieg'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Data i godzina wizyty"
              type="datetime-local"
              value={visitDialog.data}
              onChange={(e) => setVisitDialog({ ...visitDialog, data: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Rodzaj zabiegu"
              value={visitDialog.rodzajZabiegu}
              onChange={(e) => setVisitDialog({ ...visitDialog, rodzajZabiegu: e.target.value })}
              fullWidth
              required
              placeholder="np. Mezoterapia, PRP, Konsultacja kontrolna"
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={visitDialog.status}
                label="Status"
                onChange={(e) => setVisitDialog({ ...visitDialog, status: e.target.value as any })}
              >
                <MenuItem value="ZAPLANOWANA">Zaplanowana</MenuItem>
                <MenuItem value="ODBYTA">Odbyta</MenuItem>
                <MenuItem value="NIEOBECNOSC">Nieobecność</MenuItem>
                <MenuItem value="ANULOWANA">Anulowana</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Cena (PLN)"
              type="number"
              value={visitDialog.cena}
              onChange={(e) => setVisitDialog({ ...visitDialog, cena: e.target.value })}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">PLN</InputAdornment>,
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Numer w serii"
                type="number"
                value={visitDialog.numerWSerii}
                onChange={(e) => setVisitDialog({ ...visitDialog, numerWSerii: e.target.value })}
                fullWidth
                placeholder="np. 3"
              />
              <TextField
                label="Liczba zabiegów w serii"
                type="number"
                value={visitDialog.liczbaSerii}
                onChange={(e) => setVisitDialog({ ...visitDialog, liczbaSerii: e.target.value })}
                fullWidth
                placeholder="np. 6"
              />
            </Box>
            {visitDialog.numerWSerii && visitDialog.liczbaSerii && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Zabieg {visitDialog.numerWSerii} z {visitDialog.liczbaSerii}
              </Alert>
            )}
            <TextField
              label="Notatki"
              value={visitDialog.notatki}
              onChange={(e) => setVisitDialog({ ...visitDialog, notatki: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setVisitDialog({ ...visitDialog, open: false })}
            sx={{
              color: '#1d1d1f',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleVisitSubmit}
            variant="contained"
            sx={{
              bgcolor: '#AF52DE',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#9B30D9',
                boxShadow: 'none',
              },
            }}
          >
            {visitDialog.mode === 'edit' ? 'Zapisz zmiany' : 'Dodaj wizytę'}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Reminder Dialog */}
      <Dialog
        open={reminderDialog.open}
        onClose={() => setReminderDialog({ ...reminderDialog, open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 2 }}>
          Wyślij przypomnienie o wizycie
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Wizyta:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {reminderDialog.rodzajZabiegu}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reminderDialog.visitData ? new Date(reminderDialog.visitData).toLocaleString('pl-PL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : ''}
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Adres email odbiorcy"
            type="email"
            value={reminderDialog.recipientEmail}
            onChange={(e) => setReminderDialog({ ...reminderDialog, recipientEmail: e.target.value })}
            required
            sx={{ mb: 2 }}
            helperText={!patient?.email && 'Pacjent nie ma zapisanego adresu email'}
          />

          <TextField
            fullWidth
            label="Dodatkowa wiadomość (opcjonalnie)"
            multiline
            rows={4}
            value={reminderDialog.customMessage}
            onChange={(e) => setReminderDialog({ ...reminderDialog, customMessage: e.target.value })}
            placeholder="Dodaj dodatkową wiadomość do przypomnienia..."
            sx={{ mb: 2 }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            Pacjent otrzyma email z przypomnieniem oraz możliwością zapisania wizyty do kalendarza (Google Calendar, Outlook, lub plik .ics).
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setReminderDialog({ ...reminderDialog, open: false })}
            disabled={sendingReminder}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSendVisitReminder}
            variant="contained"
            startIcon={sendingReminder ? <CircularProgress size={20} /> : <Send />}
            disabled={sendingReminder || !reminderDialog.recipientEmail}
            sx={{
              bgcolor: '#FF9500',
              '&:hover': { bgcolor: '#E68900' },
            }}
          >
            {sendingReminder ? 'Wysyłanie...' : 'Wyślij przypomnienie'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
