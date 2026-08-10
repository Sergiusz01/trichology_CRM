import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Patient } from '../hooks/queries/usePatients';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Button,
    CircularProgress,
    IconButton,
    ListItemButton,
    ListItemIcon,
    alpha,
    TextField,
    InputAdornment,
    LinearProgress,
    useTheme,
    useMediaQuery,
    Chip,
    Alert,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    ButtonBase,
} from '@mui/material';
import {
    PersonAdd,
    EventNote,
    ArrowForward,
    Search,
    Warning,
    Assessment,
    EventAvailable,
    AttachMoney,
    Refresh,
    Add,
    CalendarToday,
    Today,
    Schedule,
    Notifications,
    DeleteSweep,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../contexts/AuthContext';
import { AppCard, AppButton, AppTextField, PageHeader } from '../ui';
import { ErrorState } from '../ui/ErrorState';
import { formatPhone } from '../utils/formatPhone';
import { QuickActionsWidget } from '../components/dashboard/QuickActionsWidget';
import { TodoWidget } from '../components/dashboard/TodoWidget';
import { RevenueWidget } from '../components/dashboard/RevenueWidget';
import { AgendaWidget } from '../components/dashboard/AgendaWidget';

interface DashboardStats {
    patientsCount: number;
    consultationsCount: number;
    emailsSentCount: number;
    patientsThisWeek: number;
    consultationsThisWeek: number;
    patientsWithoutConsultation: number;
}

interface UpcomingVisit {
    id: string;
    data: string;
    rodzajZabiegu: string;
    status: string;
    numerWSerii?: number;
    liczbaSerii?: number;
    cena?: number;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

interface WeeklyRevenue {
    plannedRevenue: number;
    completedRevenue: number;
    totalExpectedRevenue: number;
    visitsThisWeek: {
        zaplanowana: number;
        odbyta: number;
        nieobecnosc: number;
        anulowana: number;
    };
}

import { VISIT_STATUS_CONFIG } from '../constants/visitStatus';

interface VisitEvent {
    id: string;
    eventType: string;
    createdAt: string;
    createdBy: string;
    isRead: boolean;
    payload: Record<string, unknown>;
    visit: {
        id: string;
        rodzajZabiegu: string;
        data: string;
        status: string;
        patientId: string;
        patient: { id: string; firstName: string; lastName: string };
    };
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
    CONFIRMED: { label: 'Potwierdzono wizytę', icon: '✅', color: '#4caf50' },
    CANCELED: { label: 'Anulowano wizytę', icon: '❌', color: '#f44336' },
    RESCHEDULE_REQUESTED: { label: 'Prośba o zmianę terminu', icon: '🔄', color: '#ff9800' },
    REMINDER_SENT: { label: 'Wysłano przypomnienie', icon: '📧', color: '#1976d2' },
};

function relativeTime(dateStr: string): string {
    const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return 'przed chwilą';
    if (diffMin < 60) return `${diffMin} min temu`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} godz. temu`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'wczoraj';
    if (diffD < 7) return `${diffD} dni temu`;
    return new Date(dateStr).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
}

const ACTIVITY_INITIAL = 8;

function PatientActivityCard() {
    const navigate = useNavigate();
    const [showAll, setShowAll] = useState(false);
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['visit-events'],
        queryFn: async () => {
            const res = await api.get('/dashboard/visit-events?limit=50');
            return res.data.events as VisitEvent[];
        },
        refetchInterval: 60_000,
    });

    const events = data || [];
    const unreadCount = events.filter(e => !e.isRead).length;
    const displayed = showAll ? events : events.slice(0, ACTIVITY_INITIAL);

    const handleClick = async (event: VisitEvent) => {
        navigate(`/patients/${event.visit.patient.id}?tab=visits&visitId=${event.visit.id}`);
        if (!event.isRead) {
            try {
                await api.post('/dashboard/visit-events/mark-read', { eventIds: [event.id] });
                await refetch();
            } catch (_) {}
        }
    };

    const markAllRead = async () => {
        const ids = events.filter(e => !e.isRead).map(e => e.id);
        if (ids.length > 0) {
            try {
                await api.post('/dashboard/visit-events/mark-read', { eventIds: ids });
                await refetch();
            } catch (_) {}
        }
    };

    const clearHistory = async (mode: 'read' | 'all') => {
        try {
            await api.delete(`/dashboard/visit-events/clear?mode=${mode}`);
            await refetch();
        } catch (_) {}
    };

    const readCount = events.filter(e => e.isRead).length;

    return (
        <Box sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Notifications sx={{ color: '#1976d2', fontSize: 22 }} />
                    Aktywność pacjentów
                    {unreadCount > 0 && (
                        <Chip
                            label={unreadCount}
                            size="small"
                            sx={{ bgcolor: '#1976d2', color: 'white', fontWeight: 700, height: 18, fontSize: '0.7rem', ml: 0.5 }}
                        />
                    )}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            variant="text"
                            onClick={markAllRead}
                            sx={{ fontSize: '0.75rem', textTransform: 'none', color: 'text.secondary' }}
                        >
                            Oznacz jako przeczytane
                        </Button>
                    )}
                    {readCount > 0 && (
                        <Tooltip title="Wyczyść przeczytane">
                            <IconButton
                                size="small"
                                onClick={() => clearHistory('read')}
                                sx={{ color: 'text.secondary', '&:hover': { color: '#d32f2f', bgcolor: alpha('#d32f2f', 0.08) } }}
                            >
                                <DeleteSweep sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {events.length > 0 && readCount === 0 && (
                        <Tooltip title="Wyczyść całą historię">
                            <IconButton
                                size="small"
                                onClick={() => clearHistory('all')}
                                sx={{ color: 'text.secondary', '&:hover': { color: '#d32f2f', bgcolor: alpha('#d32f2f', 0.08) } }}
                            >
                                <DeleteSweep sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                {isLoading ? (
                    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : events.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Brak aktywności. Potwierdzenia, anulowania i prośby o zmianę terminu pojawią się tutaj po wysłaniu przypomnień z przyciskami akcji.
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <List sx={{ p: 0 }} dense>
                            {displayed.map((event, idx) => {
                                const config = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.CONFIRMED;
                                const visitDate = new Date(event.visit.data);
                                return (
                                    <React.Fragment key={event.id}>
                                        {idx > 0 && <Divider />}
                                        <ListItemButton
                                            onClick={() => handleClick(event)}
                                            sx={{
                                                py: 0.9,
                                                px: 2,
                                                '&:hover': { bgcolor: alpha(config.color, 0.04) },
                                                borderLeft: event.isRead ? '3px solid transparent' : `3px solid ${config.color}`,
                                                bgcolor: event.isRead ? 'transparent' : alpha(config.color, 0.02),
                                            }}
                                        >
                                            <Box sx={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                bgcolor: alpha(config.color, 0.12),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.9rem', flexShrink: 0, mr: 1.5,
                                            }}>
                                                {config.icon}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: event.isRead ? 500 : 700, fontSize: '0.82rem' }}>
                                                        {event.visit.patient.firstName} {event.visit.patient.lastName}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{
                                                        color: config.color, fontWeight: 600, fontSize: '0.7rem',
                                                        bgcolor: alpha(config.color, 0.1), px: 0.75, borderRadius: 1,
                                                    }}>
                                                        {config.label}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.71rem' }}>
                                                    {event.visit.rodzajZabiegu} · {visitDate.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', flexShrink: 0, ml: 1 }}>
                                                {relativeTime(event.createdAt)}
                                            </Typography>
                                        </ListItemButton>
                                    </React.Fragment>
                                );
                            })}
                        </List>
                        {events.length > ACTIVITY_INITIAL && (
                            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', textAlign: 'center', py: 0.75 }}>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setShowAll(v => !v)}
                                    sx={{ fontSize: '0.75rem', textTransform: 'none', color: 'text.secondary' }}
                                >
                                    {showAll ? 'Pokaż mniej' : `Pokaż starsze (${events.length - ACTIVITY_INITIAL} więcej)`}
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Paper>
        </Box>
    );
}

export default function DashboardPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const { error: showError, success: showSuccess } = useNotification();
    const { user } = useAuth();

    // --- Search & Modal Local State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const [reminderDialog, setReminderDialog] = useState<{
        open: boolean;
        visitId: string | null;
        visitData: string;
        rodzajZabiegu: string;
        patientName: string;
        patientEmail: string;
        customMessage: string;
        recipientEmail: string;
    }>({
        open: false,
        visitId: null,
        visitData: '',
        rodzajZabiegu: '',
        patientName: '',
        patientEmail: '',
        customMessage: '',
        recipientEmail: '',
    });
    const [sendingReminder, setSendingReminder] = useState(false);

    // --- Data Fetching with React Query ---
    const {
        data: dashboardData,
        isLoading: loading,
        isRefetching: refreshing,
        isError,
        error: queryError,
        refetch
    } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data;
        },
        retry: 1,
    });

    const error = isError ? (queryError as AxiosError<{ message?: string; error?: string }>)?.response?.data?.message || (queryError as AxiosError<{ message?: string; error?: string }>)?.response?.data?.error || (queryError as Error).message || 'Nie udało się załadować danych dashboardu' : null;

    // --- Derived State ---
    const stats = dashboardData?.stats || {
        patientsCount: 0,
        consultationsCount: 0,
        emailsSentCount: 0,
        patientsThisWeek: 0,
        consultationsThisWeek: 0,
        patientsWithoutConsultation: 0,
    };
    const patientsNeedingAttention = dashboardData?.patientsNeedingAttention || [];
    const inactivePatientsList = dashboardData?.inactivePatients || [];
    const upcomingVisits = dashboardData?.upcomingVisits || [];
    const weeklyRevenue = dashboardData?.weeklyRevenue || {
        plannedRevenue: 0,
        completedRevenue: 0,
        totalExpectedRevenue: 0,
        visitsThisWeek: { zaplanowana: 0, odbyta: 0, nieobecnosc: 0, anulowana: 0 },
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const todayVisits = upcomingVisits.filter((visit: UpcomingVisit) => {
        const visitDate = new Date(visit.data);
        return visitDate >= today && visitDate < tomorrow;
    });

    const tomorrowVisits = upcomingVisits.filter((visit: UpcomingVisit) => {
        const visitDate = new Date(visit.data);
        return visitDate >= tomorrow && visitDate < dayAfterTomorrow;
    });

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
                patientName: '',
                patientEmail: '',
                customMessage: '',
                recipientEmail: '',
            });
            refetch(); // Reload dashboard data
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd wysyłania przypomnienia');
        } finally {
            setSendingReminder(false);
        }
    };

    const openReminderDialog = async (visit: UpcomingVisit) => {
        // Try to fetch patient email if not available
        let patientEmail = '';
        try {
            const patientRes = await api.get(`/patients/${visit.patient.id}`);
            patientEmail = patientRes.data.patient?.email || '';
        } catch (err) {
            console.error('Błąd pobierania email pacjenta:', err);
        }

        setReminderDialog({
            open: true,
            visitId: visit.id,
            visitData: visit.data,
            rodzajZabiegu: visit.rodzajZabiegu,
            patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
            patientEmail: patientEmail,
            customMessage: '',
            recipientEmail: patientEmail,
        });
    };

    // Wyszukiwanie z debounce
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const response = await api.get('/patients');
                const patients = response.data.patients || [];
                const filtered = patients.filter((p: Patient) =>
                    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.phone?.includes(searchQuery)
                ).slice(0, 5);
                setSearchResults(filtered);
            } catch (error) {
                console.error('Search failed', error);
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const formatVisitTime = (dateString: string): string => {
        const date = new Date(dateString);
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const formatVisitDate = (dateString: string): string => {
        const date = new Date(dateString);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = format(date, 'MMM', { locale: pl });
        return `${day} ${month}`;
    };

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh'
            }}>
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    if (error && stats.patientsCount === 0 && todayVisits.length === 0 && tomorrowVisits.length === 0) {
        return (
            <Box sx={{ pt: 10, pb: 4 }}>
                <ErrorState message={error} onRetry={() => refetch()} />
            </Box>
        );
    }

    const statCards = [
        {
            title: 'Pacjentów',
            value: stats.patientsCount,
            subtitle: `+${stats.patientsThisWeek} w tym tygodniu`,
            icon: PersonAdd,
            color: '#1976d2',
            progress: stats.patientsThisWeek > 0 && stats.patientsCount > 0 ? (stats.patientsThisWeek / stats.patientsCount) * 100 : 0,
            link: '/patients',
        },
        {
            title: 'Konsultacji',
            value: stats.consultationsCount,
            subtitle: `+${stats.consultationsThisWeek} w tym tygodniu`,
            icon: EventNote,
            color: '#1976d2',
            progress: stats.consultationsThisWeek > 0 && stats.consultationsCount > 0 ? (stats.consultationsThisWeek / stats.consultationsCount) * 100 : 0,
            link: '/consultations',
        },
        {
            title: 'Wizyt dzisiaj',
            value: todayVisits.length,
            subtitle: `${tomorrowVisits.length} jutro`,
            icon: CalendarToday,
            color: '#1976d2',
            progress: 0,
            link: '#visits',
        },
        {
            title: 'Bez konsultacji',
            value: stats.patientsWithoutConsultation,
            subtitle: 'Wymaga uwagi',
            icon: Warning,
            color: '#d32f2f',
            progress: stats.patientsWithoutConsultation > 0 && stats.patientsCount > 0 ? (stats.patientsWithoutConsultation / stats.patientsCount) * 100 : 0,
            link: '#attention',
        },
    ];

    const isEmptyDb = stats.patientsCount === 0 && !searchQuery;

    if (isEmptyDb) {
        return (
            <Box sx={{ pb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
                <PageHeader
                    title="Witaj w Light Clinic 2026!"
                    subtitle={format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
                />
                <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: { xs: 3, md: 8 }, bgcolor: 'white', borderRadius: 4, border: '2px dashed', borderColor: alpha('#1976d2', 0.2) }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', mb: 3 }}>
                        <PersonAdd sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 2, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                        Twój system jest gotowy do pracy
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 600, fontSize: '1.1rem', lineHeight: 1.6 }}>
                        Wygląda na to, że nie masz jeszcze żadnych pacjentów w swojej bazie. Rozpocznij pracę, dodając pierwszą osobę, a następnie zaplanuj dla niej konsultację lub wizytę w kalendarzu.
                    </Typography>
                    <AppButton
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/patients/new')}
                        size="large"
                        sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
                    >
                        DODAJ PIERWSZEGO PACJENTA
                    </AppButton>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 4, display: 'flex', flexDirection: 'column' }}>
            {/* Header Section */}
            <PageHeader
                title="Panel Główny"
                subtitle={format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
                action={
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Tooltip title="Odśwież dane">
                            <IconButton
                                onClick={() => refetch()}
                                disabled={refreshing}
                                sx={{
                                    bgcolor: alpha('#1976d2', 0.08),
                                    '&:hover': { bgcolor: alpha('#1976d2', 0.12) },
                                }}
                            >
                                <Refresh sx={{
                                    color: '#1976d2',
                                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                                    '@keyframes spin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' },
                                    },
                                }} />
                            </IconButton>
                        </Tooltip>
                        <AppButton
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => navigate('/patients/new')}
                        >
                            {isMobile ? 'Dodaj' : 'Dodaj pacjenta'}
                        </AppButton>
                    </Box>
                }
            />

            {/* Search Bar */}
            <AppCard sx={{ mb: 4 }}>
                <TextField
                    fullWidth
                    placeholder="Szybkie wyszukiwanie pacjenta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="medium"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {searchLoading ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    <Search sx={{ color: 'text.secondary' }} />
                                )}
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: '#F8FAFC',
                            '& fieldset': { borderColor: 'transparent' },
                            '&:hover fieldset': { borderColor: 'transparent' },
                            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                        },
                    }}
                />
                {searchResults.length > 0 && (
                    <List sx={{ mt: 2, p: 0 }}>
                        {searchResults.map((patient) => (
                            <ListItemButton
                                key={patient.id}
                                onClick={() => {
                                    navigate(`/patients/${patient.id}`);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                sx={{
                                    borderRadius: 2,
                                    mb: 0.5,
                                    '&:hover': {
                                        bgcolor: '#F1F5F9',
                                    },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'white', color: 'primary.main', border: '1px solid #E2E8F0', fontWeight: 600 }}>
                                        {patient.firstName[0]}{patient.lastName[0]}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${patient.firstName} ${patient.lastName}`}
                                    primaryTypographyProps={{ fontWeight: 600, color: '#0F172A' }}
                                    secondary={patient.email || formatPhone(patient.phone)}
                                />
                                <ArrowForward sx={{ color: 'text.secondary', opacity: 0.5 }} />
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </AppCard>

            {/* Stats Cards */}
            <Grid container spacing={{ xs: 1.5, sm: 3 }} sx={{ mb: 4, px: { xs: 1, sm: 0 }, order: { xs: 5, md: 3 } }}>
                {statCards.map((stat, index) => (
                    <Grid key={index} size={{ xs: 6, sm: 6, md: 3 }}>
                        <AppCard
                            noPadding
                            onClick={() => stat.link.startsWith('#') ? null : navigate(stat.link)}
                            sx={{
                                height: '100%',
                                cursor: stat.link.startsWith('#') ? 'default' : 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': stat.link.startsWith('#') ? {} : {
                                    transform: 'translateY(-4px)',
                                },
                            }}
                        >
                            <Box sx={{ p: { xs: 1.5, sm: 3 }, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: { xs: 36, sm: 48 },
                                            height: { xs: 36, sm: 48 },
                                            borderRadius: '12px',
                                            background: alpha(stat.color, 0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <stat.icon sx={{ color: stat.color, fontSize: { xs: 18, sm: 24 } }} />
                                    </Box>
                                </Box>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 0.5,
                                        fontSize: { xs: '1.6rem', sm: '2.25rem' },
                                        color: '#0F172A',
                                    }}
                                >
                                    {stat.value}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                                    {stat.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mb: stat.progress > 0 ? 2 : 0, display: 'block' }}>
                                    {stat.subtitle}
                                </Typography>
                                {stat.progress > 0 && (
                                    <Box sx={{ mt: 2, width: '100%', overflow: 'hidden', borderRadius: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(stat.progress, 100)}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: alpha(stat.color, 0.1),
                                                '& .MuiLinearProgress-bar': {
                                                    background: stat.color,
                                                    borderRadius: 3,
                                                },
                                            }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </AppCard>
                    </Grid>
                ))}
            </Grid>

            {/* Quick Actions */}
            <QuickActionsWidget />

            {/* New Widgets Grid (Agenda, Todo, Revenue) */}
            <Grid container spacing={3} sx={{ mb: 4, px: { xs: 1, sm: 0 }, order: { xs: 4, md: 5 } }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <AgendaWidget visits={upcomingVisits.slice(0, 8)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            {user?.id && <TodoWidget userId={user.id} />}
                        </Grid>
                        {(user?.role === 'ADMIN' || user?.role === 'DOCTOR') && (
                            <Grid size={{ xs: 12 }}>
                                <RevenueWidget data={weeklyRevenue} />
                            </Grid>
                        )}
                    </Grid>
                </Grid>
            </Grid>

            {/* Patient Activity — actions from email links */}
            <PatientActivityCard />

            {/* Patients Needing Attention */}
            {(patientsNeedingAttention.length > 0 || inactivePatientsList.length > 0) && (
                <Box id="attention" sx={{ mb: 4, px: { xs: 1, sm: 0 }, order: { xs: 6, md: 6 } }}>
                    <Grid container spacing={3}>
                        {patientsNeedingAttention.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <AppCard
                                    sx={{
                                        border: '1px solid',
                                        borderColor: '#FECACA',
                                        boxShadow: 'none',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Warning sx={{ color: '#d32f2f', fontSize: { xs: 24, sm: 32 } }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#d32f2f', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                                Pacjenci bez konsultacji
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {stats.patientsWithoutConsultation} pacjentów wymaga uwagi
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <List sx={{ p: 0 }}>
                                        {patientsNeedingAttention.map((patient) => (
                                            <React.Fragment key={patient.id}>
                                                <ListItemButton
                                                    onClick={() => navigate(`/patients/${patient.id}`)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        mb: 0.5,
                                                        '&:hover': {
                                                            bgcolor: alpha('#d32f2f', 0.05),
                                                        },
                                                    }}
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: alpha('#d32f2f', 0.1), color: '#d32f2f', fontWeight: 600 }}>
                                                            {patient.firstName[0]}{patient.lastName[0]}
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {patient.firstName} {patient.lastName}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Typography variant="caption" color="text.secondary">
                                                                Dodany: {format(new Date(patient.createdAt), 'dd MMM yyyy', { locale: pl })}
                                                            </Typography>
                                                        }
                                                    />
                                                    <ArrowForward sx={{ color: '#d32f2f', opacity: 0.5 }} />
                                                </ListItemButton>
                                            </React.Fragment>
                                        ))}
                                    </List>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => navigate('/patients')}
                                        sx={{
                                            mt: 2,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            borderColor: '#d32f2f',
                                            color: '#d32f2f',
                                            '&:hover': {
                                                borderColor: '#d32f2f',
                                                bgcolor: alpha('#d32f2f', 0.05),
                                            },
                                        }}
                                    >
                                        Zobacz wszystkich
                                    </Button>
                                </AppCard>
                            </Grid>
                        )}

                        {inactivePatientsList.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <AppCard
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: 'none',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Assessment sx={{ color: '#1976d2', fontSize: { xs: 24, sm: 32 } }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                                Pacjenci nieaktywni
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Brak konsultacji przez 30+ dni
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <List sx={{ p: 0 }}>
                                        {inactivePatientsList.map((patient) => (
                                            <React.Fragment key={patient.id}>
                                                <ListItemButton
                                                    onClick={() => navigate(`/patients/${patient.id}`)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        mb: 0.5,
                                                        '&:hover': {
                                                            bgcolor: alpha('#1976d2', 0.05),
                                                        },
                                                    }}
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', fontWeight: 600 }}>
                                                            {patient.firstName[0]}{patient.lastName[0]}
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {patient.firstName} {patient.lastName}
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Typography variant="caption" color="text.secondary">
                                                                Dodany: {format(new Date(patient.createdAt), 'dd MMM yyyy', { locale: pl })}
                                                            </Typography>
                                                        }
                                                    />
                                                    <ArrowForward sx={{ color: '#1976d2', opacity: 0.5 }} />
                                                </ListItemButton>
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </AppCard>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}

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
                            Pacjent:
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {reminderDialog.patientName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Wizyta:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
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

                    <AppTextField
                        name="email"
                        fullWidth
                        label="Adres email odbiorcy"
                        type="email"
                        value={reminderDialog.recipientEmail}
                        onChange={(e) => setReminderDialog({ ...reminderDialog, recipientEmail: e.target.value })}
                        required
                        sx={{ mb: 2 }}
                        helperText={!reminderDialog.patientEmail ? 'Pacjent nie ma zapisanego adresu email' : 'Email pacjenta'}
                    />

                    <AppTextField
                        name="customMessage"
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
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <AppButton
                        onClick={() => setReminderDialog({ ...reminderDialog, open: false })}
                        disabled={sendingReminder}
                    >
                        Anuluj
                    </AppButton>
                    <AppButton
                        onClick={handleSendVisitReminder}
                        variant="contained"
                        startIcon={sendingReminder ? <CircularProgress size={20} /> : <Notifications />}
                        disabled={sendingReminder || !reminderDialog.recipientEmail}
                        sx={{
                            bgcolor: '#FF9500',
                            '&:hover': { bgcolor: '#E68900' },
                        }}
                    >
                        {sendingReminder ? 'Wysyłanie...' : 'Wyślij przypomnienie'}
                    </AppButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
