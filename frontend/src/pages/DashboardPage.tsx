import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from '@mui/material';
import {
    PersonAdd,
    EventNote,
    Email,
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
    TrendingUp,
    LocalHospital,
    Edit,
    Science,
    PhotoCamera,
    Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNotification } from '../hooks/useNotification';

interface DashboardStats {
    patientsCount: number;
    consultationsCount: number;
    emailsSentCount: number;
    patientsThisWeek: number;
    consultationsThisWeek: number;
    patientsWithoutConsultation: number;
}

interface RecentActivity {
    id: string;
    type: 'PATIENT' | 'PATIENT_EDIT' | 'CONSULTATION' | 'CONSULTATION_EDIT' | 'VISIT' | 'VISIT_EDIT' | 'LAB_RESULT' | 'LAB_RESULT_EDIT' | 'SCALP_PHOTO' | 'CARE_PLAN' | 'CARE_PLAN_EDIT' | 'EMAIL';
    title: string;
    subtitle: string;
    date: string;
    link: string;
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

export default function DashboardPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const { error: showError, success: showSuccess } = useNotification();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const isFetchingRef = useRef(false);
    const [stats, setStats] = useState<DashboardStats>({
        patientsCount: 0,
        consultationsCount: 0,
        emailsSentCount: 0,
        patientsThisWeek: 0,
        consultationsThisWeek: 0,
        patientsWithoutConsultation: 0,
    });
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [patientsNeedingAttention, setPatientsNeedingAttention] = useState<any[]>([]);
    const [inactivePatientsList, setInactivePatientsList] = useState<any[]>([]);
    const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([]);
    const [todayVisits, setTodayVisits] = useState<UpcomingVisit[]>([]);
    const [tomorrowVisits, setTomorrowVisits] = useState<UpcomingVisit[]>([]);
    const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyRevenue>({
        plannedRevenue: 0,
        completedRevenue: 0,
        totalExpectedRevenue: 0,
        visitsThisWeek: { zaplanowana: 0, odbyta: 0, nieobecnosc: 0, anulowana: 0 },
    });
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
            fetchDashboardData(true);
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

    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        // Zapobiegaj wielokrotnym wywołaniom używając ref
        if (isFetchingRef.current && !isRefresh) {
            return;
        }

        try {
            isFetchingRef.current = true;
            setIsFetching(true);
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Użyj jednego endpointu zamiast wielu równoległych zapytań
            const dashboardRes = await api.get('/dashboard');
            const dashboardData = dashboardRes.data;

            const visits = dashboardData.upcomingVisits || [];
            setUpcomingVisits(visits);
            setWeeklyRevenue(dashboardData.weeklyRevenue || {
                plannedRevenue: 0,
                completedRevenue: 0,
                totalExpectedRevenue: 0,
                visitsThisWeek: { zaplanowana: 0, odbyta: 0, nieobecnosc: 0, anulowana: 0 },
            });

            // Podziel wizyty na dzisiejsze i jutrzejsze
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            const todayVisitsList = visits.filter((visit: UpcomingVisit) => {
                const visitDate = new Date(visit.data);
                return visitDate >= today && visitDate < tomorrow;
            });

            const tomorrowVisitsList = visits.filter((visit: UpcomingVisit) => {
                const visitDate = new Date(visit.data);
                return visitDate >= tomorrow && visitDate < dayAfterTomorrow;
            });

            setTodayVisits(todayVisitsList);
            setTomorrowVisits(tomorrowVisitsList);

            // Użyj danych z endpointu dashboard
            setStats(dashboardData.stats || {
                patientsCount: 0,
                consultationsCount: 0,
                emailsSentCount: 0,
                patientsThisWeek: 0,
                consultationsThisWeek: 0,
                patientsWithoutConsultation: 0,
            });

            setPatientsNeedingAttention(dashboardData.patientsNeedingAttention || []);
            setInactivePatientsList(dashboardData.inactivePatients || []);
            setRecentActivities(dashboardData.recentActivities || []);
        } catch (error: any) {
            // Obsługa błędów 429 (Too Many Requests)
            if (error?.response?.status === 429) {
                const retryAfter = error?.response?.headers?.['retry-after'] || 60;
                const errorMessage = `Zbyt wiele żądań. Spróbuj ponownie za ${retryAfter} sekund.`;
                setError(errorMessage);
                showError(errorMessage);
                // Automatyczne ponowienie po czasie retry
                setTimeout(() => {
                    if (!isFetchingRef.current) {
                        fetchDashboardData(true);
                    }
                }, retryAfter * 1000);
            } else {
                const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Nie udało się załadować danych dashboardu';
                setError(errorMessage);
                showError(errorMessage);
                console.error('Failed to fetch dashboard data:', {
                    status: error?.response?.status,
                    statusText: error?.response?.statusText,
                    data: error?.response?.data,
                    message: error?.message,
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsFetching(false);
            isFetchingRef.current = false;
        }
    }, [showError]);

    useEffect(() => {
        // Wywołaj tylko raz przy montowaniu komponentu
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Pusta tablica - wywołaj tylko raz

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
                const filtered = patients.filter((p: any) =>
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

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header Section */}
            <Box sx={{ 
                mb: { xs: 3, sm: 4 }, 
                px: { xs: 1, sm: 0 },
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 2,
            }}>
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            fontSize: { xs: '1.75rem', sm: '2rem' },
                            color: 'text.primary',
                            mb: 1,
                        }}
                    >
                        Panel Główny
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Tooltip title="Odśwież dane">
                        <IconButton
                            onClick={() => fetchDashboardData(true)}
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
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/patients/new')}
                        sx={{
                            bgcolor: '#1976d2',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 500,
                            borderRadius: 2,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: '#1565c0',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {isMobile ? 'Dodaj' : 'Dodaj pacjenta'}
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, mx: { xs: 1, sm: 0 } }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Search Bar */}
            <Paper
                sx={{
                    p: { xs: 1.5, sm: 2 },
                    mb: 4,
                    mx: { xs: 1, sm: 0 },
                    background: 'white',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
            >
                <TextField
                    fullWidth
                    placeholder="Szybkie wyszukiwanie pacjenta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size={isMobile ? 'small' : 'medium'}
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
                            borderRadius: 3,
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
                                    borderRadius: 3,
                                    mb: 1,
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
                                    primary={`${patient.firstName} ${patient.lastName}`}
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                    secondary={patient.email || patient.phone}
                                />
                                <ArrowForward sx={{ color: 'text.secondary', opacity: 0.5 }} />
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </Paper>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
                {statCards.map((stat, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card
                            onClick={() => stat.link.startsWith('#') ? null : navigate(stat.link)}
                            sx={{
                                position: 'relative',
                                overflow: 'visible',
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                background: 'white',
                                height: '100%',
                                cursor: stat.link.startsWith('#') ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': stat.link.startsWith('#') ? {} : {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                },
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '3px',
                                    background: stat.color,
                                    borderRadius: '16px 16px 0 0',
                                },
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '8px',
                                            background: alpha(stat.color, 0.1),
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
                                        fontWeight: 600,
                                        mb: 0.5,
                                        fontSize: { xs: '2rem', sm: '2.5rem' },
                                        color: 'text.primary',
                                    }}
                                >
                                    {stat.value}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                                    {stat.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    {stat.subtitle}
                                </Typography>
                                {stat.progress > 0 && (
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(stat.progress, 100)}
                                        sx={{
                                            mt: 2.5,
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: alpha(stat.color, 0.1),
                                            '& .MuiLinearProgress-bar': {
                                                background: stat.color,
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Quick Actions & Revenue */}
            <Grid container spacing={3} sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
                {/* Quick Actions */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        sx={{
                            p: { xs: 2.5, sm: 3 },
                            height: '100%',
                            borderRadius: 3,
                            background: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                            Szybkie akcje
                        </Typography>
                        <List sx={{ p: 0 }}>
                            <ListItemButton
                                onClick={() => navigate('/patients/new')}
                                sx={{
                                    mb: 1,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: alpha('#1976d2', 0.05),
                                        borderColor: '#1976d2',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <PersonAdd sx={{ color: '#1976d2' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Dodaj pacjenta"
                                    primaryTypographyProps={{
                                        fontWeight: 500,
                                        color: 'text.primary',
                                    }}
                                />
                                <ArrowForward sx={{ color: 'text.secondary', opacity: 0.5 }} />
                            </ListItemButton>
                            <ListItemButton
                                onClick={() => navigate('/visits/new')}
                                sx={{
                                    mb: 1,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: alpha('#1976d2', 0.05),
                                        borderColor: '#1976d2',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <CalendarToday sx={{ color: '#1976d2' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Nowa wizyta"
                                    primaryTypographyProps={{
                                        fontWeight: 500,
                                        color: 'text.primary',
                                    }}
                                />
                                <ArrowForward sx={{ color: 'text.secondary', opacity: 0.5 }} />
                            </ListItemButton>
                            <ListItemButton
                                onClick={() => navigate('/patients')}
                                sx={{
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: alpha('#1976d2', 0.05),
                                        borderColor: '#1976d2',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <Assessment sx={{ color: '#1976d2' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Lista pacjentów"
                                    primaryTypographyProps={{
                                        fontWeight: 500,
                                        color: 'text.primary',
                                    }}
                                />
                                <ArrowForward sx={{ color: 'text.secondary', opacity: 0.5 }} />
                            </ListItemButton>
                        </List>
                    </Paper>
                </Grid>

                {/* Weekly Revenue */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper
                        sx={{
                            p: { xs: 2.5, sm: 4 },
                            height: '100%',
                            borderRadius: 3,
                            background: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <AttachMoney sx={{ fontSize: 32, color: '#1976d2' }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    Przychody w tym tygodniu
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {format(new Date(), 'dd MMM', { locale: pl })} - {format(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), 'dd MMM', { locale: pl })}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h3" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
                                {weeklyRevenue.totalExpectedRevenue.toFixed(0)} zł
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Oczekiwany przychód
                            </Typography>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {weeklyRevenue.completedRevenue.toFixed(0)} zł
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Zrealizowane
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {weeklyRevenue.plannedRevenue.toFixed(0)} zł
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Zaplanowane
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {weeklyRevenue.visitsThisWeek.odbyta}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Odbyte
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {weeklyRevenue.visitsThisWeek.zaplanowana}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Zaplanowane
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            {/* Today & Tomorrow Visits */}
            {(todayVisits.length > 0 || tomorrowVisits.length > 0 || upcomingVisits.length > 0) && (
                <Box id="visits" sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Nadchodzące wizyty
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<Add />}
                            onClick={() => navigate('/patients')}
                            size="small"
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: 2,
                            }}
                        >
                            Dodaj wizytę
                        </Button>
                    </Box>
                    <Grid container spacing={3}>
                        {todayVisits.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper
                                    sx={{
                                        p: { xs: 2, sm: 3 },
                                        background: 'white',
                                        borderRadius: 3,
                                        border: '2px solid',
                                        borderColor: '#1976d2',
                                        boxShadow: `0 8px 24px ${alpha('#1976d2', 0.15)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Today sx={{ color: '#1976d2', fontSize: 28 }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                                Dzisiaj
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {todayVisits.length} {todayVisits.length === 1 ? 'wizyta' : 'wizyt'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <List sx={{ p: 0 }}>
                                        {todayVisits.map((visit, index) => {
                                            const statusConfig = VISIT_STATUS_CONFIG[visit.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                                            return (
                                                <React.Fragment key={visit.id}>
                                                    {index > 0 && <Divider sx={{ my: 1 }} />}
                                                    <ListItemButton
                                                        onClick={() => navigate(`/patients/${visit.patient.id}`)}
                                                        sx={{
                                                            borderRadius: 2,
                                                            '&:hover': {
                                                                bgcolor: alpha('#1976d2', 0.05),
                                                            },
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', fontWeight: 600 }}>
                                                                {visit.patient.firstName[0]}{visit.patient.lastName[0]}
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                        {visit.patient.firstName} {visit.patient.lastName}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={statusConfig.label}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: statusConfig.bgColor,
                                                                            color: statusConfig.color,
                                                                            fontWeight: 600,
                                                                            fontSize: '0.7rem',
                                                                            height: 20,
                                                                        }}
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {visit.rodzajZabiegu}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600 }}>
                                                                        {formatVisitTime(visit.data)}
                                                                    </Typography>
                                                                    {visit.cena && (
                                                                        <Typography variant="caption" sx={{ bgcolor: alpha('#34C759', 0.1), color: '#34C759', px: 1, borderRadius: 1, fontWeight: 600 }}>
                                                                            {Number(visit.cena).toFixed(0)} zł
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            }
                                                        />
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openReminderDialog(visit);
                                                                }}
                                                                sx={{ 
                                                                    color: '#FF9500',
                                                                    '&:hover': { bgcolor: alpha('#FF9500', 0.1) }
                                                                }}
                                                            >
                                                                <Notifications fontSize="small" />
                                                            </IconButton>
                                                            <ArrowForward sx={{ color: '#1976d2', opacity: 0.5 }} />
                                                        </Box>
                                                    </ListItemButton>
                                                </React.Fragment>
                                            );
                                        })}
                                    </List>
                                </Paper>
                            </Grid>
                        )}
                        {tomorrowVisits.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper
                                    sx={{
                                        p: { xs: 2, sm: 3 },
                                        background: 'white',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: alpha('#1976d2', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#1976d2', 0.1)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Schedule sx={{ color: '#1976d2', fontSize: 28 }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                                                Jutro
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {tomorrowVisits.length} {tomorrowVisits.length === 1 ? 'wizyta' : 'wizyt'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <List sx={{ p: 0 }}>
                                        {tomorrowVisits.map((visit, index) => {
                                            const statusConfig = VISIT_STATUS_CONFIG[visit.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                                            return (
                                                <React.Fragment key={visit.id}>
                                                    {index > 0 && <Divider sx={{ my: 1 }} />}
                                                    <ListItemButton
                                                        onClick={() => navigate(`/patients/${visit.patient.id}`)}
                                                        sx={{
                                                            borderRadius: 2,
                                                            '&:hover': {
                                                                bgcolor: alpha('#1976d2', 0.05),
                                                            },
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', fontWeight: 600 }}>
                                                                {visit.patient.firstName[0]}{visit.patient.lastName[0]}
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                        {visit.patient.firstName} {visit.patient.lastName}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={statusConfig.label}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: statusConfig.bgColor,
                                                                            color: statusConfig.color,
                                                                            fontWeight: 600,
                                                                            fontSize: '0.7rem',
                                                                            height: 20,
                                                                        }}
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {visit.rodzajZabiegu}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600 }}>
                                                                        {formatVisitDate(visit.data)}, {formatVisitTime(visit.data)}
                                                                    </Typography>
                                                                    {visit.cena && (
                                                                        <Typography variant="caption" sx={{ bgcolor: alpha('#34C759', 0.1), color: '#34C759', px: 1, borderRadius: 1, fontWeight: 600 }}>
                                                                            {Number(visit.cena).toFixed(0)} zł
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            }
                                                        />
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openReminderDialog(visit);
                                                                }}
                                                                sx={{ 
                                                                    color: '#FF9500',
                                                                    '&:hover': { bgcolor: alpha('#FF9500', 0.1) }
                                                                }}
                                                            >
                                                                <Notifications fontSize="small" />
                                                            </IconButton>
                                                            <ArrowForward sx={{ color: '#1976d2', opacity: 0.5 }} />
                                                        </Box>
                                                    </ListItemButton>
                                                </React.Fragment>
                                            );
                                        })}
                                    </List>
                                </Paper>
                            </Grid>
                        )}
                        {todayVisits.length === 0 && tomorrowVisits.length === 0 && upcomingVisits.length > 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Paper
                                    sx={{
                                        p: { xs: 2, sm: 3 },
                                        background: 'white',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: alpha('#1976d2', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#1976d2', 0.1)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <EventAvailable sx={{ color: '#1976d2', fontSize: { xs: 24, sm: 32 } }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                                Nadchodzące wizyty i zabiegi
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Najbliższe zaplanowane wizyty
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <List sx={{ p: 0 }}>
                                        {upcomingVisits.slice(0, 6).map((visit, index) => {
                                            const statusConfig = VISIT_STATUS_CONFIG[visit.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                                            return (
                                                <React.Fragment key={visit.id}>
                                                    {index > 0 && <Divider sx={{ my: 1 }} />}
                                                    <ListItemButton
                                                        onClick={() => navigate(`/patients/${visit.patient.id}`)}
                                                        sx={{
                                                            borderRadius: 2,
                                                            '&:hover': {
                                                                bgcolor: alpha('#1976d2', 0.05),
                                                            },
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', fontWeight: 600 }}>
                                                                {visit.patient.firstName[0]}{visit.patient.lastName[0]}
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                        {visit.patient.firstName} {visit.patient.lastName}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={statusConfig.label}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: statusConfig.bgColor,
                                                                            color: statusConfig.color,
                                                                            fontWeight: 600,
                                                                            fontSize: '0.7rem',
                                                                            height: 20,
                                                                        }}
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {visit.rodzajZabiegu}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600 }}>
                                                                        {formatVisitDate(visit.data)}, {formatVisitTime(visit.data)}
                                                                    </Typography>
                                                                    {visit.numerWSerii && visit.liczbaSerii && (
                                                                        <Typography variant="caption" sx={{ bgcolor: alpha('#007AFF', 0.1), color: '#007AFF', px: 1, borderRadius: 1, fontWeight: 600 }}>
                                                                            {visit.numerWSerii}/{visit.liczbaSerii}
                                                                        </Typography>
                                                                    )}
                                                                    {visit.cena && (
                                                                        <Typography variant="caption" sx={{ bgcolor: alpha('#34C759', 0.1), color: '#34C759', px: 1, borderRadius: 1, fontWeight: 600 }}>
                                                                            {Number(visit.cena).toFixed(0)} zł
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            }
                                                        />
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openReminderDialog(visit);
                                                                            }}
                                                                            sx={{ 
                                                                                color: '#FF9500',
                                                                                '&:hover': { bgcolor: alpha('#FF9500', 0.1) }
                                                                            }}
                                                                        >
                                                                            <Notifications fontSize="small" />
                                                                        </IconButton>
                                                                        <ArrowForward sx={{ color: '#1976d2', opacity: 0.5 }} />
                                                                    </Box>
                                                                </ListItemButton>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </List>
                                            </Paper>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        )}

            {/* Patients Needing Attention */}
            {(patientsNeedingAttention.length > 0 || inactivePatientsList.length > 0) && (
                <Box id="attention" sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
                    <Grid container spacing={3}>
                        {patientsNeedingAttention.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper
                                    sx={{
                                        p: { xs: 2, sm: 3 },
                                        background: 'white',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: alpha('#d32f2f', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#d32f2f', 0.1)}`,
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
                                </Paper>
                            </Grid>
                        )}

                        {inactivePatientsList.length > 0 && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper
                                    sx={{
                                        p: { xs: 2, sm: 3 },
                                        background: 'white',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: alpha('#1976d2', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#1976d2', 0.1)}`,
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
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}

            {/* Recent Activity */}
            {recentActivities.length > 0 && (
                <Box sx={{ px: { xs: 1, sm: 0 } }}>
                    <Paper
                        sx={{
                            p: { xs: 2, sm: 3 },
                            background: 'white',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Ostatnia aktywność
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Najnowsze zdarzenia w systemie
                                </Typography>
                            </Box>
                            <Button
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/patients')}
                                variant="contained"
                                fullWidth={isMobile}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    background: '#1976d2',
                                    boxShadow: `0 4px 12px ${alpha('#667eea', 0.2)}`,
                                    '&:hover': {
                                        background: '#1565c0',
                                    },
                                }}
                            >
                                Zobacz wszystkich
                            </Button>
                        </Box>
                        <List sx={{ p: 0 }}>
                            {recentActivities.map((activity, index) => (
                                <React.Fragment key={activity.id}>
                                    {index > 0 && <Divider sx={{ my: 1 }} />}
                                    <ListItem
                                        sx={{
                                            px: 2,
                                            py: 2,
                                            borderRadius: 2,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                bgcolor: alpha('#667eea', 0.05),
                                                transform: 'translateX(4px)',
                                            },
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    background: activity.type === 'PATIENT' || activity.type === 'PATIENT_EDIT'
                                                        ? '#1976d2'
                                                        : activity.type === 'CONSULTATION' || activity.type === 'CONSULTATION_EDIT'
                                                            ? '#d32f2f'
                                                            : activity.type === 'VISIT' || activity.type === 'VISIT_EDIT'
                                                                ? '#34C759'
                                                                : activity.type === 'LAB_RESULT' || activity.type === 'LAB_RESULT_EDIT'
                                                                    ? '#FF9500'
                                                                    : activity.type === 'SCALP_PHOTO'
                                                                        ? '#AF52DE'
                                                                        : activity.type === 'CARE_PLAN' || activity.type === 'CARE_PLAN_EDIT'
                                                                            ? '#007AFF'
                                                                            : '#1976d2',
                                                }}
                                            >
                                                {activity.type === 'PATIENT' ? <PersonAdd /> :
                                                    activity.type === 'PATIENT_EDIT' ? <Edit /> :
                                                    activity.type === 'CONSULTATION' ? <EventNote /> :
                                                    activity.type === 'CONSULTATION_EDIT' ? <Edit /> :
                                                    activity.type === 'VISIT' ? <CalendarToday /> :
                                                    activity.type === 'VISIT_EDIT' ? <Edit /> :
                                                    activity.type === 'LAB_RESULT' ? <Science /> :
                                                    activity.type === 'LAB_RESULT_EDIT' ? <Edit /> :
                                                    activity.type === 'SCALP_PHOTO' ? <PhotoCamera /> :
                                                    activity.type === 'CARE_PLAN' ? <Assignment /> :
                                                    activity.type === 'CARE_PLAN_EDIT' ? <Edit /> :
                                                    <Email />}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                    {activity.title}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography component="span" variant="body2" color="text.primary">
                                                        {activity.subtitle}
                                                    </Typography>
                                                    <Typography component="span" variant="caption" color="text.secondary">
                                                        • {format(new Date(activity.date), 'dd MMM yyyy, HH:mm', { locale: pl })}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        <IconButton
                                            edge="end"
                                            onClick={() => navigate(activity.link)}
                                            sx={{
                                                bgcolor: alpha('#667eea', 0.1),
                                                '&:hover': {
                                                    bgcolor: alpha('#667eea', 0.2),
                                                },
                                            }}
                                        >
                                            <ArrowForward sx={{ color: '#667eea' }} />
                                        </IconButton>
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
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
                        helperText={!reminderDialog.patientEmail ? 'Pacjent nie ma zapisanego adresu email' : 'Email pacjenta'}
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
                        startIcon={sendingReminder ? <CircularProgress size={20} /> : <Notifications />}
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
