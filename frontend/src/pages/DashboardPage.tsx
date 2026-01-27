import React, { useState, useEffect, useCallback } from 'react';
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
    type: 'PATIENT' | 'CONSULTATION' | 'EMAIL';
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
    const { error: showError } = useNotification();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
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

    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [patientsRes, consultationsRes, emailsRes, upcomingVisitsRes, weeklyRevenueRes] = await Promise.all([
                api.get('/patients'),
                api.get('/consultations'),
                api.get('/email/history', { params: { limit: 10 } }),
                api.get('/visits/upcoming').catch(() => ({ data: { visits: [] } })),
                api.get('/visits/stats/weekly-revenue').catch(() => ({
                    data: {
                        plannedRevenue: 0,
                        completedRevenue: 0,
                        totalExpectedRevenue: 0,
                        visitsThisWeek: { zaplanowana: 0, odbyta: 0, nieobecnosc: 0, anulowana: 0 },
                    },
                })),
            ]);

            const visits = upcomingVisitsRes.data.visits || [];
            setUpcomingVisits(visits);
            setWeeklyRevenue(weeklyRevenueRes.data);

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

            const patients = patientsRes.data.patients || [];
            const consultations = consultationsRes.data.consultations || [];
            const emails = emailsRes.data.emails || [];

            // Oblicz statystyki
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const patientsThisWeek = patients.filter((p: any) =>
                new Date(p.createdAt) > weekAgo
            ).length;

            const consultationsThisWeek = consultations.filter((c: any) =>
                new Date(c.consultationDate) > weekAgo
            ).length;

            const patientsWithoutConsultation = patients.filter((p: any) =>
                !consultations.some((c: any) => c.patientId === p.id)
            ).length;

            const sentEmailsCount = emails.filter((e: any) => e.status === 'SENT').length;

            setStats({
                patientsCount: patients.length,
                consultationsCount: consultations.length,
                emailsSentCount: sentEmailsCount,
                patientsThisWeek,
                consultationsThisWeek,
                patientsWithoutConsultation,
            });

            // Sprawdź pacjentów bez aktywności przez 30 dni
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const inactivePatients = patients.filter((p: any) => {
                const lastConsultation = consultations
                    .filter((c: any) => c.patientId === p.id)
                    .sort((a: any, b: any) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime())[0];

                return lastConsultation && new Date(lastConsultation.consultationDate) < thirtyDaysAgo;
            });

            // Zapisz pacjentów wymagających uwagi
            const patientsWithoutConsultations = patients.filter((p: any) =>
                !consultations.some((c: any) => c.patientId === p.id)
            );
            setPatientsNeedingAttention(patientsWithoutConsultations.slice(0, 5));
            setInactivePatientsList(inactivePatients.slice(0, 5));

            // Budowanie ostatniej aktywności
            const activities: RecentActivity[] = [];

            // Dodaj ostatnich pacjentów
            const sortedPatients = [...patients]
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .slice(0, 3);

            sortedPatients.forEach(patient => {
                activities.push({
                    id: `patient-${patient.id}`,
                    type: 'PATIENT',
                    title: 'Dodano nowego pacjenta',
                    subtitle: `${patient.firstName} ${patient.lastName}`,
                    date: patient.createdAt || new Date().toISOString(),
                    link: `/patients/${patient.id}`,
                });
            });

            // Dodaj ostatnie konsultacje
            const sortedConsultations = [...consultations]
                .sort((a, b) => new Date(b.consultationDate || 0).getTime() - new Date(a.consultationDate || 0).getTime())
                .slice(0, 3);

            sortedConsultations.forEach(consultation => {
                const patient = patients.find((p: any) => p.id === consultation.patientId);
                activities.push({
                    id: `consultation-${consultation.id}`,
                    type: 'CONSULTATION',
                    title: 'Konsultacja',
                    subtitle: patient ? `${patient.firstName} ${patient.lastName}` : 'Nieznany pacjent',
                    date: consultation.consultationDate || new Date().toISOString(),
                    link: `/patients/${consultation.patientId}`,
                });
            });

            // Dodaj ostatnie emaile
            const sortedEmails = [...emails]
                .filter((e: any) => e.status === 'SENT')
                .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime())
                .slice(0, 3);

            sortedEmails.forEach((email: any) => {
                const patient = email.patient || patients.find((p: any) => p.id === email.patientId);
                activities.push({
                    id: `email-${email.id}`,
                    type: 'EMAIL',
                    title: 'Wysłano email',
                    subtitle: patient ? `${patient.firstName} ${patient.lastName} - ${email.subject}` : email.subject,
                    date: email.sentAt || new Date().toISOString(),
                    link: `/patients/${email.patientId}`,
                });
            });

            // Sortuj wszystkie aktywności po dacie
            activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Weź tylko 8 najnowszych
            setRecentActivities(activities.slice(0, 8));
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Nie udało się załadować danych dashboardu';
            setError(errorMessage);
            showError(errorMessage);
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

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
            color: '#667eea',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            progress: stats.patientsThisWeek > 0 && stats.patientsCount > 0 ? (stats.patientsThisWeek / stats.patientsCount) * 100 : 0,
            link: '/patients',
        },
        {
            title: 'Konsultacji',
            value: stats.consultationsCount,
            subtitle: `+${stats.consultationsThisWeek} w tym tygodniu`,
            icon: EventNote,
            color: '#f5576c',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            progress: stats.consultationsThisWeek > 0 && stats.consultationsCount > 0 ? (stats.consultationsThisWeek / stats.consultationsCount) * 100 : 0,
            link: '/consultations',
        },
        {
            title: 'Wizyt dzisiaj',
            value: todayVisits.length,
            subtitle: `${tomorrowVisits.length} jutro`,
            icon: CalendarToday,
            color: '#AF52DE',
            gradient: 'linear-gradient(135deg, #AF52DE 0%, #9B30D9 100%)',
            progress: 0,
            link: '#visits',
        },
        {
            title: 'Bez konsultacji',
            value: stats.patientsWithoutConsultation,
            subtitle: 'Wymaga uwagi',
            icon: Warning,
            color: '#fee140',
            gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
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
                            fontWeight: 800,
                            fontSize: { xs: '1.75rem', sm: '2.5rem' },
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
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
                                bgcolor: alpha('#667eea', 0.1),
                                '&:hover': { bgcolor: alpha('#667eea', 0.2) },
                            }}
                        >
                            <Refresh sx={{ 
                                color: '#667eea',
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
                            bgcolor: '#667eea',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 2,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: '#5568d3',
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
                                    <Search sx={{ color: '#667eea' }} />
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
                                        bgcolor: alpha('#667eea', 0.05),
                                    },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: alpha('#667eea', 0.1), color: '#667eea', fontWeight: 700 }}>
                                        {patient.firstName[0]}{patient.lastName[0]}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${patient.firstName} ${patient.lastName}`}
                                    primaryTypographyProps={{ fontWeight: 600 }}
                                    secondary={patient.email || patient.phone}
                                />
                                <ArrowForward sx={{ color: '#667eea', opacity: 0.5 }} />
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
                                    height: '6px',
                                    background: stat.gradient,
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
                                            borderRadius: '12px',
                                            background: stat.gradient,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: `0 8px 16px ${alpha(stat.color, 0.3)}`,
                                        }}
                                    >
                                        <stat.icon sx={{ color: 'white', fontSize: 24 }} />
                                    </Box>
                                </Box>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 800,
                                        mb: 0.5,
                                        fontSize: { xs: '2rem', sm: '2.5rem' },
                                        background: stat.gradient,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
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
                                                background: stat.gradient,
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
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            boxShadow: `0 8px 24px ${alpha('#667eea', 0.25)}`,
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'white' }}>
                            Szybkie akcje
                        </Typography>
                        <List sx={{ p: 0 }}>
                            <ListItemButton
                                onClick={() => navigate('/patients/new')}
                                sx={{
                                    mb: 1.5,
                                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.25)',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <PersonAdd sx={{ color: 'white' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Dodaj pacjenta"
                                    primaryTypographyProps={{
                                        fontWeight: 600,
                                        color: 'white',
                                    }}
                                />
                                <ArrowForward sx={{ color: 'white', opacity: 0.7 }} />
                            </ListItemButton>
                            <ListItemButton
                                onClick={() => navigate('/consultations/new')}
                                sx={{
                                    mb: 1.5,
                                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.25)',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <EventNote sx={{ color: 'white' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Dodaj konsultację"
                                    primaryTypographyProps={{
                                        fontWeight: 600,
                                        color: 'white',
                                    }}
                                />
                                <ArrowForward sx={{ color: 'white', opacity: 0.7 }} />
                            </ListItemButton>
                            <ListItemButton
                                onClick={() => navigate('/patients')}
                                sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: 'rgba(255, 255, 255, 0.25)',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    <Assessment sx={{ color: 'white' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Lista pacjentów"
                                    primaryTypographyProps={{
                                        fontWeight: 600,
                                        color: 'white',
                                    }}
                                />
                                <ArrowForward sx={{ color: 'white', opacity: 0.7 }} />
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
                            background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                            color: 'white',
                            boxShadow: `0 8px 24px ${alpha('#34C759', 0.25)}`,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <AttachMoney sx={{ fontSize: 32 }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                                    Przychody w tym tygodniu
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    {format(new Date(), 'dd MMM', { locale: pl })} - {format(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), 'dd MMM', { locale: pl })}
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
                                {weeklyRevenue.totalExpectedRevenue.toFixed(0)} zł
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Oczekiwany przychód
                            </Typography>
                        </Box>
                        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', my: 2 }} />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                        {weeklyRevenue.completedRevenue.toFixed(0)} zł
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Zrealizowane
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                        {weeklyRevenue.plannedRevenue.toFixed(0)} zł
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Zaplanowane
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {weeklyRevenue.visitsThisWeek.odbyta}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        Odbyte
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        {weeklyRevenue.visitsThisWeek.zaplanowana}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
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
                                        borderColor: '#AF52DE',
                                        boxShadow: `0 8px 24px ${alpha('#AF52DE', 0.15)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Today sx={{ color: '#AF52DE', fontSize: 28 }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#AF52DE' }}>
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
                                                                bgcolor: alpha('#AF52DE', 0.05),
                                                            },
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: alpha('#AF52DE', 0.1), color: '#AF52DE', fontWeight: 600 }}>
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
                                                                    <Typography variant="caption" sx={{ color: '#AF52DE', fontWeight: 600 }}>
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
                                                        <ArrowForward sx={{ color: '#AF52DE', opacity: 0.5 }} />
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
                                        borderColor: alpha('#AF52DE', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#AF52DE', 0.1)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Schedule sx={{ color: '#AF52DE', fontSize: 28 }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#AF52DE' }}>
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
                                                                bgcolor: alpha('#AF52DE', 0.05),
                                                            },
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: alpha('#AF52DE', 0.1), color: '#AF52DE', fontWeight: 600 }}>
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
                                                                    <Typography variant="caption" sx={{ color: '#AF52DE', fontWeight: 600 }}>
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
                                                        <ArrowForward sx={{ color: '#AF52DE', opacity: 0.5 }} />
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
                                        borderColor: alpha('#AF52DE', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#AF52DE', 0.1)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <EventAvailable sx={{ color: '#AF52DE', fontSize: { xs: 24, sm: 32 } }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#AF52DE', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
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
                                                                bgcolor: alpha('#AF52DE', 0.05),
                                                            },
                                                        }}
                                                    >
                                                        <ListItemAvatar>
                                                            <Avatar sx={{ bgcolor: alpha('#AF52DE', 0.1), color: '#AF52DE', fontWeight: 600 }}>
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
                                                                    <Typography variant="caption" sx={{ color: '#AF52DE', fontWeight: 600 }}>
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
                                                        <ArrowForward sx={{ color: '#AF52DE', opacity: 0.5 }} />
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
                                        borderColor: alpha('#fa709a', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#fa709a', 0.1)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Warning sx={{ color: '#fa709a', fontSize: { xs: 24, sm: 32 } }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fa709a', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
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
                                                            bgcolor: alpha('#fa709a', 0.05),
                                                        },
                                                    }}
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: alpha('#fa709a', 0.1), color: '#fa709a', fontWeight: 600 }}>
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
                                                    <ArrowForward sx={{ color: '#fa709a', opacity: 0.5 }} />
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
                                            borderColor: '#fa709a',
                                            color: '#fa709a',
                                            '&:hover': {
                                                borderColor: '#fa709a',
                                                bgcolor: alpha('#fa709a', 0.05),
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
                                        borderColor: alpha('#4facfe', 0.3),
                                        boxShadow: `0 8px 24px ${alpha('#4facfe', 0.1)}`,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Assessment sx={{ color: '#4facfe', fontSize: { xs: 24, sm: 32 } }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#4facfe', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
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
                                                            bgcolor: alpha('#4facfe', 0.05),
                                                        },
                                                    }}
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: alpha('#4facfe', 0.1), color: '#4facfe', fontWeight: 600 }}>
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
                                                    <ArrowForward sx={{ color: '#4facfe', opacity: 0.5 }} />
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
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: `0 4px 12px ${alpha('#667eea', 0.2)}`,
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
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
                                                    background: activity.type === 'PATIENT'
                                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                        : activity.type === 'CONSULTATION'
                                                            ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                                                            : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                                }}
                                            >
                                                {activity.type === 'PATIENT' ? <PersonAdd /> :
                                                    activity.type === 'CONSULTATION' ? <EventNote /> : <Email />}
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
        </Box>
    );
}
