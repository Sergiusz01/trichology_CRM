import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Patient } from '../hooks/queries/usePatients';
import {
    Box,
    Grid,
    Paper,
    Typography,
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
    alpha,
    TextField,
    InputAdornment,
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
    Skeleton,
    Stack,
} from '@mui/material';
import {
    PersonAdd,
    ArrowForward,
    Search,
    Refresh,
    Add,
    Notifications,
    DeleteSweep,
    Close,
    MailOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../contexts/AuthContext';
import { AppButton, AppTextField } from '../ui';
import { ErrorState } from '../ui/ErrorState';
import { formatPhone } from '../utils/formatPhone';
import { TodoWidget } from '../components/dashboard/TodoWidget';
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

const EVENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    CONFIRMED: { label: 'Potwierdzono wizytę', icon: <MailOutline sx={{ fontSize: 14 }} />, color: '#4caf50' },
    CANCELED: { label: 'Anulowano wizytę', icon: <MailOutline sx={{ fontSize: 14 }} />, color: '#f44336' },
    RESCHEDULE_REQUESTED: { label: 'Prośba o zmianę terminu', icon: <MailOutline sx={{ fontSize: 14 }} />, color: '#ff9800' },
    REMINDER_SENT: { label: 'Wysłano przypomnienie', icon: <MailOutline sx={{ fontSize: 14 }} />, color: '#1976d2' },
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

const ACTIVITY_INITIAL = 3;

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
                <Typography sx={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Aktywność pacjentów
                    {unreadCount > 0 && (
                        <Chip
                            label={unreadCount}
                            size="small"
                            sx={{ bgcolor: '#0A84FF', color: 'white', fontWeight: 700, height: 18, fontSize: '0.7rem', ml: 0.5 }}
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
                                                color: config.color,
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

    // --- Search State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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

    // --- Data Fetching ---
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

    const todayVisits = upcomingVisits.filter((visit: UpcomingVisit) => {
        const visitDate = new Date(visit.data);
        return visitDate >= today && visitDate < tomorrow;
    });

    const visitsThisWeekTotal = Object.values(weeklyRevenue.visitsThisWeek).reduce((a, b) => (a as number) + (b as number), 0);

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
                open: false, visitId: null, visitData: '', rodzajZabiegu: '',
                patientName: '', patientEmail: '', customMessage: '', recipientEmail: '',
            });
            refetch();
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd wysyłania przypomnienia');
        } finally {
            setSendingReminder(false);
        }
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

    const isEmptyDb = stats.patientsCount === 0 && !searchQuery;

    // ===== LOADING STATE =====
    if (loading) {
        return (
            <Box sx={{ pb: 4, display: 'flex', flexDirection: 'column', maxWidth: '100%', overflowX: 'hidden' }}>
                <Box sx={{ mb: 3 }}>
                    <Skeleton width={200} height={28} />
                    <Skeleton width={160} height={18} sx={{ mt: 0.5 }} />
                </Box>
                <Skeleton height={36} sx={{ mb: 3, borderRadius: 1 }} />
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} height={isMobile ? 72 : 56} sx={{ mb: 1, borderRadius: 1 }} />
                        ))}
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Skeleton height={200} sx={{ borderRadius: 2 }} />
                    </Grid>
                </Grid>
            </Box>
        );
    }

    if (error && stats.patientsCount === 0 && todayVisits.length === 0) {
        return (
            <Box sx={{ pt: 10, pb: 4 }}>
                <ErrorState message={error} onRetry={() => refetch()} />
            </Box>
        );
    }

    if (isEmptyDb) {
        return (
            <Box sx={{ pb: 4, px: { xs: 1, sm: 2, md: 3 } }}>
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ fontSize: 22, fontWeight: 600, color: 'text.primary' }}>
                        Witaj w Light Clinic 2026
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'text.secondary', mt: 0.5 }}>
                        {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
                    </Typography>
                </Box>
                <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: { xs: 3, md: 8 }, bgcolor: 'white', borderRadius: 3, border: '2px dashed', borderColor: alpha('#3B82F6', 0.2) }}>
                    <Avatar sx={{ width: 64, height: 64, bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6', mb: 3 }}>
                        <PersonAdd sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Typography sx={{ fontSize: 22, fontWeight: 600, color: 'text.primary', mb: 2 }}>
                        Twój system jest gotowy do pracy
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', mb: 4, maxWidth: 600, fontSize: 14, lineHeight: 1.6 }}>
                        Nie masz jeszcze żadnych pacjentów w bazie. Dodaj pierwszą osobę, aby rozpocząć pracę.
                    </Typography>
                    <AppButton
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/patients/new')}
                        size="large"
                        sx={{ px: 4, py: 1.5 }}
                    >
                        Dodaj pierwszego pacjenta
                    </AppButton>
                </Box>
            </Box>
        );
    }

    // ===== METRICS DATA =====
    const metrics = [
        { label: todayVisits.length === 1 ? 'wizyta dziś' : 'wizyty dziś', value: todayVisits.length, link: '#' },
        { label: 'w tym tygodniu', value: visitsThisWeekTotal, link: '/visits' },
        { label: 'pacjentów', value: stats.patientsCount, link: '/patients' },
    ];

    // ===== SEARCH RESULTS COMPONENT =====
    const searchResultsList = searchResults.length > 0 ? (
        <List sx={{ p: 0 }}>
            {searchResults.map((patient) => (
                <ListItemButton
                    key={patient.id}
                    onClick={() => {
                        navigate(`/patients/${patient.id}`);
                        setSearchQuery('');
                        setSearchResults([]);
                        setMobileSearchOpen(false);
                    }}
                    sx={{ borderRadius: 2, mb: 0.5, '&:hover': { bgcolor: '#F1F5F9' } }}
                >
                    <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'white', color: 'primary.main', border: '1px solid #E2E8F0', fontWeight: 600, width: 36, height: 36, fontSize: 13 }}>
                            {patient.firstName[0]}{patient.lastName[0]}
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                        primary={`${patient.firstName} ${patient.lastName}`}
                        primaryTypographyProps={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}
                        secondary={patient.email || formatPhone(patient.phone)}
                        secondaryTypographyProps={{ fontSize: 12 }}
                    />
                    <ArrowForward sx={{ color: 'text.secondary', opacity: 0.5, fontSize: 18 }} />
                </ListItemButton>
            ))}
        </List>
    ) : null;

    return (
        <Box sx={{
            pb: 4, display: 'flex', flexDirection: 'column',
            maxWidth: '100%', overflowX: 'hidden',
            px: { xs: 2, sm: 0 },
        }}>
            {/* ===== HEADER ===== */}
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                mb: 2, flexWrap: 'wrap', gap: 1,
            }}>
                <Box>
                    <Typography sx={{ fontSize: { xs: 20, sm: 22 }, fontWeight: 600, color: 'text.primary' }}>
                        Panel główny
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'text.secondary' }}>
                        {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
                    </Typography>
                </Box>

                {/* Desktop: search + actions */}
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                    <Box sx={{ position: 'relative' }}>
                        <TextField
                            placeholder="Szukaj pacjenta…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            sx={{
                                width: 220,
                                '& .MuiOutlinedInput-root': {
                                    height: 36, fontSize: 13,
                                    '& fieldset': { borderColor: 'divider' },
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {searchLoading ? <CircularProgress size={16} /> : <Search sx={{ fontSize: 18, color: 'text.secondary' }} />}
                                    </InputAdornment>
                                ),
                            }}
                        />
                        {searchResults.length > 0 && (
                            <Paper sx={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                mt: 0.5, zIndex: 10, p: 1, maxHeight: 300, overflow: 'auto',
                                border: '1px solid', borderColor: 'divider',
                            }}>
                                {searchResultsList}
                            </Paper>
                        )}
                    </Box>
                    <AppButton
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => navigate('/visits/new')}
                        disableElevation
                        sx={{ height: 36, fontSize: 13 }}
                    >
                        Nowa wizyta
                    </AppButton>
                    <AppButton
                        variant="outlined"
                        size="small"
                        startIcon={<PersonAdd />}
                        onClick={() => navigate('/patients/new')}
                        sx={{ height: 36, fontSize: 13 }}
                    >
                        Nowy pacjent
                    </AppButton>
                    <Tooltip title="Odśwież dane">
                        <IconButton
                            onClick={() => refetch()}
                            disabled={refreshing}
                            size="small"
                            sx={{ width: 36, height: 36 }}
                        >
                            <Refresh sx={{
                                fontSize: 20, color: 'text.secondary',
                                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' },
                                },
                            }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Mobile: action buttons */}
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'flex', sm: 'none' }, mb: 2 }}>
                <AppButton
                    variant="contained"
                    size="medium"
                    startIcon={<Add />}
                    onClick={() => navigate('/visits/new')}
                    disableElevation
                    sx={{ flex: 1, height: 44, fontSize: 14 }}
                >
                    Nowa wizyta
                </AppButton>
                <AppButton
                    variant="outlined"
                    size="medium"
                    startIcon={<PersonAdd />}
                    onClick={() => navigate('/patients/new')}
                    sx={{ flex: 1, height: 44, fontSize: 14 }}
                >
                    Nowy pacjent
                </AppButton>
            </Stack>

            {/* Mobile: top bar with search + refresh */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 1, mb: 2 }}>
                <TextField
                    placeholder="Szukaj pacjenta…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            height: 36, fontSize: 14,
                            '& fieldset': { borderColor: 'divider' },
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {searchLoading ? <CircularProgress size={16} /> : <Search sx={{ fontSize: 18, color: 'text.secondary' }} />}
                            </InputAdornment>
                        ),
                    }}
                />
                <IconButton
                    onClick={() => refetch()}
                    disabled={refreshing}
                    size="small"
                    sx={{ width: 36, height: 36, flexShrink: 0 }}
                >
                    <Refresh sx={{
                        fontSize: 20, color: 'text.secondary',
                        animation: refreshing ? 'spin 1s linear infinite' : 'none',
                        '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                        },
                    }} />
                </IconButton>
            </Box>

            {/* Mobile: search results */}
            {isMobile && searchResults.length > 0 && (
                <Paper sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider' }}>
                    {searchResultsList}
                </Paper>
            )}

            {/* ===== METRICS BAR ===== */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 },
                height: 36, mb: 3,
                borderBottom: '1px solid', borderColor: 'divider',
                overflowX: 'auto', scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { display: 'none' },
                whiteSpace: 'nowrap',
                px: { xs: 0, sm: 0 },
            }}>
                {metrics.map((m, idx) => (
                    <React.Fragment key={m.label}>
                        {idx > 0 && (
                            <Typography sx={{ color: 'text.disabled', fontSize: 13, flexShrink: 0 }}>·</Typography>
                        )}
                        <ButtonBase
                            onClick={() => m.link !== '#' && navigate(m.link)}
                            sx={{
                                borderRadius: 1, px: 0.75, py: 0.25,
                                '&:hover': m.link !== '#' ? { bgcolor: 'action.hover' } : {},
                                flexShrink: 0,
                            }}
                        >
                            <Typography sx={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{m.value}</Box>
                                {' '}
                                <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>{m.label}</Box>
                            </Typography>
                        </ButtonBase>
                    </React.Fragment>
                ))}
            </Box>

            {/* ===== MAIN CONTENT: AGENDA + TODO ===== */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <AgendaWidget visits={upcomingVisits} loading={loading} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    {user?.id && <TodoWidget userId={user.id} />}
                </Grid>
            </Grid>

            {/* ===== BOTTOM STATS ===== */}
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.secondary', mb: 1.5, px: { xs: 0, sm: 0 } }}>
                Statystyki ogólne
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { title: 'Pacjenci w bazie', value: stats.patientsCount, sub: `+${stats.patientsThisWeek} w tym tyg.`, link: '/patients', color: '#0A84FF' },
                    { title: 'Konsultacje', value: stats.consultationsCount, sub: `+${stats.consultationsThisWeek} w tym tyg.`, link: '/consultations', color: '#5856D6' },
                ].map((stat) => (
                    <Grid key={stat.title} size={{ xs: 6, sm: 3 }}>
                        <ButtonBase
                            onClick={() => navigate(stat.link)}
                            sx={{
                                width: '100%', display: 'flex', textAlign: 'left',
                                borderRadius: 2, bgcolor: 'background.paper',
                                border: '1px solid', borderColor: 'divider',
                                p: 2, transition: 'all 0.15s',
                                '&:hover': { borderColor: alpha(stat.color, 0.3) },
                            }}
                        >
                            <Box>
                                <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                                    {stat.value}
                                </Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', mt: 0.5 }}>
                                    {stat.title}
                                </Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 500, color: stat.color, mt: 0.25 }}>
                                    {stat.sub}
                                </Typography>
                            </Box>
                        </ButtonBase>
                    </Grid>
                ))}
            </Grid>

            {/* ===== ACTIVITY ===== */}
            <PatientActivityCard />

            {/* ===== REMINDER DIALOG ===== */}
            <Dialog
                open={reminderDialog.open}
                onClose={() => setReminderDialog({ ...reminderDialog, open: false })}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 600, pb: 2 }}>
                    Wyślij przypomnienie o wizycie
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>Pacjent:</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{reminderDialog.patientName}</Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>Wizyta:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>{reminderDialog.rodzajZabiegu}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {reminderDialog.visitData ? new Date(reminderDialog.visitData).toLocaleString('pl-PL', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
                            }) : ''}
                        </Typography>
                    </Box>
                    <AppTextField
                        name="email" fullWidth label="Adres email odbiorcy" type="email"
                        value={reminderDialog.recipientEmail}
                        onChange={(e) => setReminderDialog({ ...reminderDialog, recipientEmail: e.target.value })}
                        required sx={{ mb: 2 }}
                        helperText={!reminderDialog.patientEmail ? 'Pacjent nie ma zapisanego adresu email' : 'Email pacjenta'}
                    />
                    <AppTextField
                        name="customMessage" fullWidth label="Dodatkowa wiadomość (opcjonalnie)"
                        multiline rows={4}
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
                    <AppButton onClick={() => setReminderDialog({ ...reminderDialog, open: false })} disabled={sendingReminder}>
                        Anuluj
                    </AppButton>
                    <AppButton
                        onClick={handleSendVisitReminder}
                        variant="contained"
                        startIcon={sendingReminder ? <CircularProgress size={20} /> : <Notifications />}
                        disabled={sendingReminder || !reminderDialog.recipientEmail}
                        sx={{ bgcolor: '#FF9500', '&:hover': { bgcolor: '#E68900' } }}
                    >
                        {sendingReminder ? 'Wysyłanie...' : 'Wyślij przypomnienie'}
                    </AppButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
