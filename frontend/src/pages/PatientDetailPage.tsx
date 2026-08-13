import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  Skeleton,
  alpha,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Tooltip,
  CardMedia,
  useTheme,
  useMediaQuery,
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
  CalendarMonth,
  Archive,
  Phone,
  LocationOn,
  Work,
  CalendarToday,
  EventAvailable,
  Notifications,
  GetApp,
  Visibility,
  Check,
  Close,
  Send,
} from '@mui/icons-material';
import { api, BASE_URL } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { ErrorRetry } from '../components/ErrorRetry';
import {
  usePatientDetail,
  usePatientDetailConsultations,
  usePatientLabResults,
  usePatientScalpPhotos,
  usePatientCarePlans,
  usePatientDetailVisits,
  useDeletePatientItem,
  useRestorePatientItem,
  usePermanentDeletePatientItem,
} from '../hooks/queries/usePatientDetail';
import { useCreateVisit, useUpdateVisit, useUpdateVisitStatus } from '../hooks/queries/useVisits';
import { useUpdatePatient } from '../hooks/queries/usePatients';
import { SecureImage } from '../components/SecureImage';

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
  notes?: string;
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
import { formatPhone } from '../utils/formatPhone';

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
      {value === index && <Box sx={{ pt: { xs: 2, sm: 5 }, px: { xs: 1.5, sm: 2, md: 4 } }}>{children}</Box>}
    </div>
  );
}

const getDeterministicColor = (id: string) => {
  const colors = [
    { bg: alpha('#007AFF', 0.1), color: '#007AFF' },
    { bg: alpha('#34C759', 0.1), color: '#34C759' },
    { bg: alpha('#FF9500', 0.1), color: '#FF9500' },
    { bg: alpha('#AF52DE', 0.1), color: '#AF52DE' },
    { bg: alpha('#FF2D55', 0.1), color: '#FF2D55' },
    { bg: alpha('#5856D6', 0.1), color: '#5856D6' },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);
  const [visitDialog, setVisitDialog] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    id: string | null;
    datePart: string;
    hour: string;
    minute: string;
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
    datePart: '',
    hour: '09',
    minute: '00',
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
  const [emailSending, setEmailSending] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [visitFilters, setVisitFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [visitPage, setVisitPage] = useState(0);
  const VISITS_PER_PAGE = 10;
  const [mobileVisitLimit, setMobileVisitLimit] = useState(5);

  // Reset pagination when filters change
  useEffect(() => {
    setVisitPage(0);
    setMobileVisitLimit(5);
  }, [visitFilters.status, visitFilters.search, visitFilters.startDate, visitFilters.endDate]);

  // ── React Query ────────────────────────────────────────────────────────────
  const { data: patient, isLoading: loading, error: patientQueryError, refetch: refetchPatient } = usePatientDetail(id);
  const { data: consultations = [] } = usePatientDetailConsultations(id, showArchived.consultations);
  const { data: labResults = [] } = usePatientLabResults(id, showArchived.labResults);
  const { data: scalpPhotos = [] } = usePatientScalpPhotos(id);
  const { data: carePlans = [] } = usePatientCarePlans(id, showArchived.carePlans);
  const { data: visits = [] } = usePatientDetailVisits(id);

  const loadError = patientQueryError
    ? (patientQueryError as any)?.response?.data?.error ?? 'Nie udało się załadować danych pacjenta'
    : null;

  // Mutation hooks
  const deleteItem = useDeletePatientItem(id!);
  const restoreItem = useRestorePatientItem(id!);
  const permanentDeleteItem = usePermanentDeletePatientItem(id!);
  const createVisit = useCreateVisit();
  const updateVisit = useUpdateVisit();
  const updateVisitStatus = useUpdateVisitStatus();
  const updatePatient = useUpdatePatient();

  // Deep-link: switch tabs from URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'visits') {
      setTabValue(4);
    } else if (tabParam === 'care-plans') {
      setTabValue(3);
    }
  }, [location.search]);

  // Invalidate on navigation refresh signal
  const handleRefreshSignal = useCallback(() => {
    if (location.state?.refresh && id) {
      refetchPatient();
      queryClient.invalidateQueries({ queryKey: ['consultations', 'patient', id] });
      queryClient.invalidateQueries({ queryKey: ['labResults', 'patient', id] });
      queryClient.invalidateQueries({ queryKey: ['carePlans', 'patient', id] });
      queryClient.invalidateQueries({ queryKey: ['visits', 'patient', id] });
      queryClient.invalidateQueries({ queryKey: ['scalpPhotos', 'patient', id] });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, id, refetchPatient, navigate, queryClient]);

  useEffect(() => {
    handleRefreshSignal();
  }, [handleRefreshSignal]);

  // Scroll to specific visit after visits data loads
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const targetVisitId = searchParams.get('visitId');

    if (tabValue === 5 && targetVisitId && visits.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`visit-${targetVisitId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.transition = 'background-color 1.5s ease-out';
          element.style.backgroundColor = alpha('#007AFF', 0.15);
          setTimeout(() => {
            element.style.backgroundColor = '';
          }, 2000);
        }
      }, 300);
    }
  }, [tabValue, visits, location.search]);

  const handleDeleteClick = (
    type: 'patient' | 'consultation' | 'labResult' | 'scalpPhoto' | 'carePlan' | 'visit',
    id: string,
    name: string
  ) => {
    setDeleteDialog({ open: true, type, id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id || !deleteDialog.type) return;

    const successMessages: Record<string, string> = {
      patient: 'Pacjent został zarchiwizowany',
      consultation: 'Konsultacja została zarchiwizowana',
      labResult: 'Wynik badania został usunięty',
      scalpPhoto: 'Zdjęcie zostało usunięte',
      carePlan: 'Plan opieki został usunięty',
      visit: 'Wizyta została usunięta',
    };

    try {
      setError('');
      setSuccess('');
      await deleteItem.mutateAsync({ type: deleteDialog.type, id: deleteDialog.id });
      showSuccess(successMessages[deleteDialog.type]);
      setDeleteDialog({ open: false, type: null, id: null, name: '' });
      if (deleteDialog.type === 'patient') {
        setTimeout(() => navigate('/patients'), 1500);
      }
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

    const successMessages: Record<string, string> = {
      consultation: 'Konsultacja została przywrócona',
      labResult: 'Wynik badania został przywrócony',
      carePlan: 'Plan opieki został przywrócony',
    };

    try {
      setError('');
      setSuccess('');
      await restoreItem.mutateAsync({ type: restoreDialog.type, id: restoreDialog.id });
      showSuccess(successMessages[restoreDialog.type]);
      setRestoreDialog({ open: false, type: null, id: null, name: '' });
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

    const successMessages: Record<string, string> = {
      consultation: 'Konsultacja została trwale usunięta zgodnie z RODO',
      labResult: 'Wynik badania został trwale usunięty zgodnie z RODO',
      carePlan: 'Plan opieki został trwale usunięty zgodnie z RODO',
    };

    try {
      setError('');
      setSuccess('');
      await permanentDeleteItem.mutateAsync({ type: permanentDeleteDialog.type, id: permanentDeleteDialog.id });
      showSuccess(successMessages[permanentDeleteDialog.type]);
      setPermanentDeleteDialog({ open: false, type: null, id: null, name: '' });
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

  const handleDownloadICS = async (visitId: string) => {
    try {
      const response = await api.get(`/visits/${visitId}/ics`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `wizyta_${visitId}.ics`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      showError('Błąd podczas pobierania pliku kalendarza');
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
      setEmailSending(true);

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
      setEmailSending(false);
    }
  };

const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const HOUR_OPTIONS = Array.from({ length: 15 }, (_, i) => String(8 + i).padStart(2, '0'));

  const openAddVisitDialog = () => {
    // Set default date to now in local time format
    // Use local time for the default, but it will be stored as UTC preserving the hour/minute
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    setVisitDialog({
      open: true,
      mode: 'add',
      id: null,
      datePart: `${year}-${month}-${day}`,
      hour: '09',
      minute: '00',
      rodzajZabiegu: '',
      notatki: '',
      status: 'ZAPLANOWANA',
      numerWSerii: '',
      liczbaSerii: '',
      cena: '',
    });
  };

  const openEditVisitDialog = (visit: Visit) => {
    const date = new Date(visit.data);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    let m = String(date.getUTCMinutes()).padStart(2, '0');
    
    // Round to nearest 15 minutes if not strictly matching
    if (!MINUTE_OPTIONS.includes(m)) {
      const min = parseInt(m, 10);
      const roundedMin = Math.round(min / 15) * 15;
      m = String(roundedMin === 60 ? 0 : roundedMin).padStart(2, '0');
    }

    setVisitDialog({
      open: true,
      mode: 'edit',
      id: visit.id,
      datePart: `${year}-${month}-${day}`,
      hour: h,
      minute: m,
      rodzajZabiegu: visit.rodzajZabiegu,
      notatki: visit.notatki || '',
      status: visit.status,
      numerWSerii: visit.numerWSerii?.toString() || '',
      liczbaSerii: visit.liczbaSerii?.toString() || '',
      cena: visit.cena?.toString() || '',
    });
  };

  const handleVisitSubmit = async () => {
    if (!visitDialog.datePart || !visitDialog.hour || !visitDialog.minute || !visitDialog.rodzajZabiegu) {
      showError('Wypełnij wymagane pola: Data, Czas i Rodzaj zabiegu');
      return;
    }

    try {
      const data = `${visitDialog.datePart}T${visitDialog.hour}:${visitDialog.minute}`;

      const visitData: any = {
        patientId: id!,
        data,
        rodzajZabiegu: visitDialog.rodzajZabiegu,
        notatki: visitDialog.notatki || null,
        status: visitDialog.status,
        numerWSerii: visitDialog.numerWSerii ? parseInt(visitDialog.numerWSerii) : null,
        liczbaSerii: visitDialog.liczbaSerii ? parseInt(visitDialog.liczbaSerii) : null,
        cena: visitDialog.cena ? parseFloat(visitDialog.cena) : null,
      };

      if (visitDialog.mode === 'edit' && visitDialog.id) {
        await updateVisit.mutateAsync({ id: visitDialog.id, data: visitData });
        showSuccess('Wizyta została zaktualizowana');
      } else {
        await createVisit.mutateAsync(visitData);
        showSuccess('Wizyta została dodana');
      }

      setVisitDialog({
        open: false, mode: 'add', id: null, datePart: '', hour: '09', minute: '00', rodzajZabiegu: '',
        notatki: '', status: 'ZAPLANOWANA', numerWSerii: '', liczbaSerii: '', cena: '',
      });
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas zapisywania wizyty');
    }
  };

  const handleStatusChange = async (visitId: string, newStatus: string) => {
    try {
      await updateVisitStatus.mutateAsync({ visitId, status: newStatus as Visit['status'], patientId: id! });
      showSuccess('Status wizyty został zmieniony');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd zmiany statusu');
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleSaveNotes = async () => {
    if (!patient) return;
    try {
      await updatePatient.mutateAsync({
        id: id!,
        data: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          age: patient.age,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          occupation: patient.occupation,
          address: patient.address,
          notes: tempNotes,
        },
      });
      showSuccess('Notatki zapisane');
      setIsEditingNotes(false);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas zapisywania notatek');
    }
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 6 }}>
        <Container maxWidth="lg" sx={{ pt: 3 }}>
          <Button variant="text" size="small" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} disabled sx={{ mb: 2, height: 28, textTransform: 'none' }}>Pacjenci</Button>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', mb: 3 }}>
                  <Skeleton variant="circular" width={64} height={64} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="40%" height={32} />
                    <Skeleton width="20%" height={24} />
                  </Box>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Skeleton variant="rounded" height={36} sx={{ flex: 1 }} />
                  <Skeleton variant="rounded" height={36} sx={{ flex: 1 }} />
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
                <Skeleton width="30%" height={24} sx={{ mb: 1 }} />
                <Skeleton width="15%" height={16} sx={{ mb: 2 }} />
                <Skeleton width="100%" height={20} />
              </Paper>
              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ display: 'flex', height: 64, alignItems: 'center', px: 2, justifyContent: 'space-between' }}>
                  {Array.from(new Array(5)).map((_, i) => (
                    <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <Skeleton width={32} height={24} />
                      <Skeleton width={48} height={16} />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
                <Skeleton width="50%" height={24} sx={{ mb: 2 }} />
                <Skeleton width="70%" height={20} sx={{ mb: 1 }} />
                <Skeleton width="80%" height={20} />
              </Paper>
            </Grid>
          </Grid>
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', borderBottom: '1px solid divider', px: 1 }}>
              {Array.from(new Array(6)).map((_, i) => (
                <Skeleton key={i} width={100} height={40} sx={{ mx: 1, my: 0.5 }} />
              ))}
            </Box>
            <Box sx={{ p: 3 }}>
              <Skeleton width="100%" height={100} />
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (!patient && !loading && loadError) {
    return (
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <ErrorRetry message={loadError} onRetry={() => refetchPatient()} />
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
    { label: 'Konsultacje', value: consultations.length, icon: Assignment, color: '#007AFF', sectionId: 'patient-tabpanel-0' },
    { label: 'Wyniki badań', value: labResults.length, icon: Science, color: '#34C759', sectionId: 'patient-tabpanel-1' },
    { label: 'Zdjęcia', value: scalpPhotos.length, icon: PhotoCamera, color: '#FF9500', sectionId: 'patient-tabpanel-2' },
    { label: 'Plany opieki', value: carePlans.length, icon: LocalHospital, color: '#FF3B30', sectionId: 'patient-tabpanel-3' },
    { label: 'Wizyty', value: visits.length, icon: EventAvailable, color: '#AF52DE', sectionId: 'patient-tabpanel-4' },
  ];

  return (
    <Box sx={{
      bgcolor: '#f5f5f7',
      minHeight: '100vh',
      pb: 6,
    }}>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        {/* Back Button */}
        {/* Back Button */}
        <Button
          variant="text"
          size="small"
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/patients')}
          sx={{
            mb: 2,
            height: 28,
            color: 'text.secondary',
            textTransform: 'none',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'transparent',
            },
          }}
        >
          Pacjenci
        </Button>

        {/* Loading Error with Retry */}
        {loadError && (
          <ErrorRetry message={loadError} onRetry={() => refetchPatient()} />
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Main Column */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Identity Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: { xs: 56, md: 64 },
                    height: { xs: 56, md: 64 },
                    fontSize: { xs: '20px', md: '20px' },
                    fontWeight: 500,
                    bgcolor: getDeterministicColor(patient.id).bg,
                    color: getDeterministicColor(patient.id).color,
                  }}
                >
                  {getInitials(patient.firstName, patient.lastName)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 500, fontSize: '24px', color: 'text.primary', textTransform: 'none', overflowWrap: 'anywhere' }}>
                    {patient.firstName} {patient.lastName}
                  </Typography>
                  <Typography sx={{ fontSize: '13px', color: 'text.secondary', mt: 0.5 }}>
                    {patient.age ? `${patient.age} lat` : 'Wiek nieznany'} · {patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : 'Inna'}
                  </Typography>
                </Box>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<Add fontSize="small" />}
                  onClick={() => navigate(`/patients/${id}/consultations/new`)}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 500,
                    height: 36,
                    borderRadius: 2,
                    flex: { sm: 1 },
                  }}
                >
                  Nowa konsultacja
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Edit fontSize="small" />}
                  onClick={() => navigate(`/patients/${id}/edit`)}
                  sx={{
                    color: 'text.primary',
                    borderColor: 'divider',
                    textTransform: 'none',
                    fontWeight: 500,
                    height: 36,
                    borderRadius: 2,
                    flex: { sm: 1 },
                  }}
                >
                  Edytuj dane
                </Button>
              </Stack>
            </Paper>

            {/* Quick Notes Card */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                mb: 3,
                ...(patient.notes && patient.notes.trim() !== '' && {
                  bgcolor: alpha(theme.palette.warning.main, 0.05),
                  borderLeft: `1px solid ${theme.palette.warning.main}`,
                  borderColor: alpha(theme.palette.warning.main, 0.2),
                })
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 500, fontSize: '13px', color: 'text.primary' }}>
                    Szybkie notatki
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: 'text.disabled' }}>
                    Widoczne tylko dla Ciebie
                  </Typography>
                </Box>
                {!isEditingNotes && (
                  <IconButton size="small" onClick={() => { setTempNotes(patient.notes || ''); setIsEditingNotes(true); }} sx={{ width: 28, height: 28 }}>
                    <Edit fontSize="small" sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Box>
              
              {isEditingNotes ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    variant="outlined"
                    size="small"
                    placeholder="Wpisz ważne uwagi o pacjencie..."
                    sx={{ bgcolor: 'background.paper', mb: 1, '& .MuiInputBase-root': { fontSize: '13px' } }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button size="small" variant="text" color="inherit" onClick={() => setIsEditingNotes(false)} sx={{ textTransform: 'none' }}>Anuluj</Button>
                    <Button size="small" variant="contained" color="primary" disableElevation onClick={handleSaveNotes} sx={{ textTransform: 'none' }}>Zapisz</Button>
                  </Box>
                </Box>
              ) : (
                <Typography sx={{ fontSize: '13px', color: (patient.notes && patient.notes.trim() !== '') ? 'text.primary' : 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {patient.notes || 'Brak wpisanych uwag. Dodaj, klikając ikonę edycji.'}
                </Typography>
              )}
            </Paper>

            {/* Stats Bar */}
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' },
                  '& > div': {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 64,
                    borderRight: { xs: 'none', sm: '1px solid', borderColor: 'divider' },
                    borderBottom: { xs: '1px solid', sm: 'none', borderColor: 'divider' },
                    '&:last-child': { borderRight: 'none', borderBottom: 'none' },
                    ...(isMobile && {
                      '&:nth-of-type(3n)': { borderRight: 'none' },
                      '&:nth-of-type(4)': { borderBottom: 'none' },
                      '&:nth-of-type(5)': { borderBottom: 'none', borderRight: '1px solid', borderColor: 'divider' },
                    })
                  },
                }}
              >
                {stats.map((stat, index) => {
                  const isZero = stat.value === 0;
                  return (
                    <Box
                      key={index}
                      onClick={() => {
                        setTabValue(index);
                        setTimeout(() => {
                          document.getElementById(stat.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      }}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(isMobile && index === 4 && {
                          borderRight: 'none !important'
                        })
                      }}
                      aria-label={`${stat.label}: ${stat.value}`}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <stat.icon sx={{ fontSize: 16, color: isZero ? 'text.disabled' : 'text.secondary' }} />
                        <Typography sx={{ fontSize: '18px', fontWeight: 500, color: isZero ? 'text.disabled' : 'text.primary' }}>
                          {stat.value}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: '11px', color: isZero ? 'text.disabled' : 'text.secondary' }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>

          {/* Right Column */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
              <Typography sx={{ fontWeight: 500, fontSize: '14px', color: 'text.primary', mb: 2 }}>
                Informacje kontaktowe
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: '13px', color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                    {patient.phone ? formatPhone(patient.phone) : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: '13px', color: 'text.primary', wordBreak: 'break-all' }}>
                    {patient.email || '—'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {(patient.address || patient.occupation) && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 500, fontSize: '14px', color: 'text.primary', mb: 2 }}>
                  Dodatkowe informacje
                </Typography>
                <Stack spacing={2}>
                  {patient.address && (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25 }} />
                      <Typography sx={{ fontSize: '13px', color: 'text.primary' }}>
                        {patient.address}
                      </Typography>
                    </Box>
                  )}
                  {patient.occupation && (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Work sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25 }} />
                      <Typography sx={{ fontSize: '13px', color: 'text.primary' }}>
                        {patient.occupation}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '12px',
            bgcolor: 'background.paper',
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
              px: 1,
              minHeight: 40,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 400,
                fontSize: '14px',
                color: 'text.secondary',
                minHeight: 40,
                py: 1,
                px: 2,
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 500,
                },
              },
              '& .MuiTabs-indicator': {
                height: 2,
                borderRadius: '2px 2px 0 0',
                bgcolor: 'primary.main',
              },
            }}
          >
            <Tab label="Konsultacje" />
            <Tab label="Wyniki" />
            <Tab label="Zdjęcia" />
            <Tab label="Plany" />
            <Tab label="Wizyty" />
          </Tabs>

          {/* Tab Panel 0: Consultations */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate(`/patients/${id}/consultations/new`)}
                sx={{
                  bgcolor: 'primary.main',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: 'primary.dark',
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
                  borderColor: 'divider',
                  color: showArchived.consultations ? 'white' : 'text.primary',
                  bgcolor: showArchived.consultations ? 'primary.main' : 'transparent',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: 'text.primary',
                    bgcolor: showArchived.consultations ? 'primary.dark' : 'action.hover',
                    boxShadow: 'none',
                  },
                }}
              >
                {showArchived.consultations ? 'Pokaż aktywne' : 'Pokaż zarchiwizowane'}
              </Button>
            </Box>
            {consultations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Assignment sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
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
                      p: { xs: 2, sm: 3 },
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, fontSize: '1.15rem' }}>
                          {new Date(consultation.createdAt || consultation.consultationDate).toLocaleString('pl-PL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).replace(',', '')}
                        </Typography>
                        {consultation.diagnosis && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.95rem', lineHeight: 1.6 }}>
                            {consultation.diagnosis}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/consultations/${consultation.id}`)}
                          sx={{
                            borderColor: 'divider',
                            color: 'text.primary',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            '&:hover': {
                              borderColor: 'text.primary',
                              bgcolor: 'action.hover',
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
                              bgcolor: 'primary.main',
                              textTransform: 'none',
                              fontWeight: 600,
                              borderRadius: '8px',
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: 'primary.dark',
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
                              sx={{ color: 'success.main' }}
                            >
                              <Restore />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handlePermanentDeleteClick('consultation', consultation.id, 'Konsultacja')}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteForever />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick('consultation', consultation.id, 'Konsultacja')}
                            sx={{ color: 'error.main' }}
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

          {/* Tab Panel 1: Lab Results */}
          <TabPanel value={tabValue} index={1}>
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
                      p: { xs: 2, sm: 3 },
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
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
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
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
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
          <TabPanel value={tabValue} index={2}>
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
                        {photo.filename || photo.filePath ? (
                          <SecureImage
                            filename={photo.filename || photo.filePath}
                            alt={photo.originalFilename || 'Zdjęcie skóry głowy'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.5s ease',
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
          <TabPanel value={tabValue} index={3}>
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
                      p: { xs: 2, sm: 3 },
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
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
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
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
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
          <TabPanel value={tabValue} index={4}>
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

            {/* Visit Filters */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Szukaj po rodzaju zabiegu..."
                    value={visitFilters.search}
                    onChange={(e) => setVisitFilters({ ...visitFilters, search: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={visitFilters.status}
                      label="Status"
                      onChange={(e) => setVisitFilters({ ...visitFilters, status: e.target.value })}
                    >
                      <MenuItem value="">Wszystkie</MenuItem>
                      <MenuItem value="ZAPLANOWANA">Zaplanowana</MenuItem>
                      <MenuItem value="ODBYTA">Odbyta</MenuItem>
                      <MenuItem value="NIEOBECNOSC">Nieobecność</MenuItem>
                      <MenuItem value="ANULOWANA">Anulowana</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Od"
                    InputLabelProps={{ shrink: true }}
                    value={visitFilters.startDate}
                    onChange={(e) => setVisitFilters({ ...visitFilters, startDate: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Do"
                    InputLabelProps={{ shrink: true }}
                    value={visitFilters.endDate}
                    onChange={(e) => setVisitFilters({ ...visitFilters, endDate: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Paper>

            {visits.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <EventAvailable sx={{ fontSize: 64, color: '#d2d2d7', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#86868b', fontWeight: 500 }}>
                  Brak wizyt i zabiegów
                </Typography>
              </Box>
            ) : isMobile ? (
              /* ── Mobile: karty ── */
              (() => {
                const mobileFiltered = visits.filter(v => {
                  if (visitFilters.status && v.status !== visitFilters.status) return false;
                  if (visitFilters.search && !v.rodzajZabiegu.toLowerCase().includes(visitFilters.search.toLowerCase())) return false;
                  if (visitFilters.startDate && new Date(v.data) < new Date(visitFilters.startDate)) return false;
                  if (visitFilters.endDate && new Date(v.data) > new Date(visitFilters.endDate + 'T23:59:59')) return false;
                  return true;
                });
                const mobileSlice = mobileFiltered.slice(0, mobileVisitLimit);
                return (
              <Stack spacing={1.5}>
                {mobileSlice.map((visit) => {
                  const statusConfig = VISIT_STATUS_CONFIG[visit.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                  return (
                    <Paper
                      id={`visit-${visit.id}`}
                      key={visit.id}
                      elevation={0}
                      sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                    >
                      {/* Nagłówek karty: data + przyciski akcji */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1d1d1f' }}>
                            {(() => {
                              const date = new Date(visit.data);
                              return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
                            })()}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#86868b' }}>
                            {(() => {
                              const date = new Date(visit.data);
                              const hours = String(date.getUTCHours()).padStart(2, '0');
                              const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                              return `${hours}:${minutes}`;
                            })()}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          {visit.status === 'ZAPLANOWANA' && patient?.email && (
                            <Tooltip title="Wyślij przypomnienie">
                              <IconButton size="small" onClick={() => openReminderDialog(visit)} sx={{ color: '#FF9500' }}>
                                <Notifications fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {visit.status === 'ZAPLANOWANA' && (
                            <Tooltip title="Dodaj do kalendarza (.ics)">
                              <IconButton size="small" onClick={() => handleDownloadICS(visit.id)} sx={{ color: '#34C759' }}>
                                <CalendarMonth fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton size="small" onClick={() => openEditVisitDialog(visit)} sx={{ color: '#007AFF' }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteClick('visit', visit.id, visit.rodzajZabiegu)} sx={{ color: '#FF3B30' }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>

                      {/* Rodzaj zabiegu */}
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1d1d1f', mb: 1.5 }}>
                        {visit.rodzajZabiegu}
                      </Typography>

                      {/* Status + Seria + Cena */}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: visit.notatki ? 1 : 0 }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select
                            value={visit.status}
                            onChange={(e) => handleStatusChange(visit.id, e.target.value)}
                            sx={{
                              bgcolor: statusConfig.bgColor,
                              color: statusConfig.color,
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: statusConfig.color },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: statusConfig.color },
                            }}
                          >
                            <MenuItem value="ZAPLANOWANA">Zaplanowana</MenuItem>
                            <MenuItem value="ODBYTA">Odbyta</MenuItem>
                            <MenuItem value="NIEOBECNOSC">Nieobecność</MenuItem>
                            <MenuItem value="ANULOWANA">Anulowana</MenuItem>
                          </Select>
                        </FormControl>
                        {visit.numerWSerii && visit.liczbaSerii && (
                          <Chip
                            label={`${visit.numerWSerii} z ${visit.liczbaSerii}`}
                            size="small"
                            sx={{ bgcolor: alpha('#007AFF', 0.1), color: '#007AFF', fontWeight: 600 }}
                          />
                        )}
                        {visit.cena ? (
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#34C759' }}>
                            {Number(visit.cena).toFixed(2)} zł
                          </Typography>
                        ) : null}
                      </Box>

                      {/* Notatki */}
                      {visit.notatki && (
                        <Typography variant="body2" sx={{ color: '#86868b', fontSize: '0.78rem', mt: 0.5 }}>
                          {visit.notatki}
                        </Typography>
                      )}
                    </Paper>
                  );
                })}
                {mobileFiltered.length > mobileVisitLimit && (
                  <Box sx={{ textAlign: 'center', pt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setMobileVisitLimit(l => l + 5)}
                      sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.8rem' }}
                    >
                      Pokaż starsze ({mobileFiltered.length - mobileVisitLimit} więcej)
                    </Button>
                  </Box>
                )}
                {mobileFiltered.length > 5 && mobileVisitLimit >= mobileFiltered.length && (
                  <Box sx={{ textAlign: 'center', pt: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setMobileVisitLimit(5)}
                      sx={{ textTransform: 'none', fontSize: '0.78rem', color: 'text.secondary' }}
                    >
                      Zwiń
                    </Button>
                  </Box>
                )}
              </Stack>
              );
              })()
            ) : (
              /* ── Desktop: tabela ── */
              <>
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
                    {visits.filter(v => {
                      if (visitFilters.status && v.status !== visitFilters.status) return false;
                      if (visitFilters.search && !v.rodzajZabiegu.toLowerCase().includes(visitFilters.search.toLowerCase())) return false;
                      if (visitFilters.startDate && new Date(v.data) < new Date(visitFilters.startDate)) return false;
                      if (visitFilters.endDate && new Date(v.data) > new Date(visitFilters.endDate + 'T23:59:59')) return false;
                      return true;
                    }).slice(visitPage * VISITS_PER_PAGE, (visitPage + 1) * VISITS_PER_PAGE).map((visit) => {
                      const statusConfig = VISIT_STATUS_CONFIG[visit.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                      return (
                        <TableRow id={`visit-${visit.id}`} key={visit.id} hover>
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
                              {visit.status === 'ZAPLANOWANA' && (
                                <Tooltip title="Dodaj do kalendarza (.ics)">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadICS(visit.id)}
                                    sx={{ color: '#34C759' }}
                                  >
                                    <CalendarMonth fontSize="small" />
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
              <TablePagination
                component="div"
                count={visits.filter(v => {
                  if (visitFilters.status && v.status !== visitFilters.status) return false;
                  if (visitFilters.search && !v.rodzajZabiegu.toLowerCase().includes(visitFilters.search.toLowerCase())) return false;
                  if (visitFilters.startDate && new Date(v.data) < new Date(visitFilters.startDate)) return false;
                  if (visitFilters.endDate && new Date(v.data) > new Date(visitFilters.endDate + 'T23:59:59')) return false;
                  return true;
                }).length}
                page={visitPage}
                onPageChange={(_, p) => setVisitPage(p)}
                rowsPerPage={VISITS_PER_PAGE}
                rowsPerPageOptions={[VISITS_PER_PAGE]}
                labelRowsPerPage=""
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} z ${count} wizyt`}
                sx={{ borderTop: '1px solid', borderColor: 'divider' }}
              />
              </>
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
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Data wizyty"
                type="date"
                value={visitDialog.datePart}
                onChange={(e) => setVisitDialog({ ...visitDialog, datePart: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth required>
                <InputLabel>Godzina</InputLabel>
                <Select
                  value={visitDialog.hour}
                  label="Godzina"
                  onChange={(e) => setVisitDialog({ ...visitDialog, hour: e.target.value as string })}
                >
                  {HOUR_OPTIONS.map((h) => (
                    <MenuItem key={h} value={h}>{h}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Minuty</InputLabel>
                <Select
                  value={visitDialog.minute}
                  label="Minuty"
                  onChange={(e) => setVisitDialog({ ...visitDialog, minute: e.target.value as string })}
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <MenuItem key={m} value={m}>:{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
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
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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
        <DialogActions sx={{ p: 2, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button
            onClick={() => setVisitDialog({ ...visitDialog, open: false })}
            fullWidth={isMobile}
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
            fullWidth={isMobile}
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
                timeZone: 'UTC',
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
            Pacjent otrzyma email z przypomnieniem zawierającym przyciski do <strong>potwierdzenia</strong>, <strong>anulowania</strong> lub <strong>zmiany terminu</strong> wizyty oraz możliwością zapisania wizyty do kalendarza.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
          <Button
            onClick={() => setReminderDialog({ ...reminderDialog, open: false })}
            disabled={sendingReminder}
            fullWidth={isMobile}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSendVisitReminder}
            variant="contained"
            fullWidth={isMobile}
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
