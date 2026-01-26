import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

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

const visitStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    ZAPLANOWANA: { label: 'Zaplanowana', color: '#FF9500', bgColor: 'rgba(255, 149, 0, 0.1)' },
    ODBYTA: { label: 'Odbyta', color: '#34C759', bgColor: 'rgba(52, 199, 89, 0.1)' },
    NIEOBECNOSC: { label: 'Nieobecność', color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.1)' },
    ANULOWANA: { label: 'Anulowana', color: '#8E8E93', bgColor: 'rgba(142, 142, 147, 0.1)' },
};

export default function DashboardPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState<DashboardStats>({
        patientsCount: 0,
        consultationsCount: 0,
        emailsSentCount: 0,
        patientsThisWeek: 0,
        consultationsThisWeek: 0,
        patientsWithoutConsultation: 0,
    });
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [patientsNeedingAttention, setPatientsNeedingAttention] = useState<any[]>([]);
    const [inactivePatientsList, setInactivePatientsList] = useState<any[]>([]);
    const [upcomingVisits, setUpcomingVisits] = useState<UpcomingVisit[]>([]);
    const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyRevenue>({
        plannedRevenue: 0,
        completedRevenue: 0,
        totalExpectedRevenue: 0,
        visitsThisWeek: { zaplanowana: 0, odbyta: 0, nieobecnosc: 0, anulowana: 0 },
    });


    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
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

                setUpcomingVisits(upcomingVisitsRes.data.visits || []);
                setWeeklyRevenue(weeklyRevenueRes.data);

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
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Wyszukiwanie pacjentów
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await api.get('/patients');
            const patients = response.data.patients || [];
            const filtered = patients.filter((p: any) =>
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
                p.email?.toLowerCase().includes(query.toLowerCase()) ||
                p.phone?.includes(query)
            ).slice(0, 5);
            setSearchResults(filtered);
        } catch (error) {
            console.error('Search failed', error);
        }
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
            progress: stats.patientsThisWeek > 0 ? (stats.patientsThisWeek / stats.patientsCount) * 100 : 0,
        },
        {
            title: 'Konsultacji',
            value: stats.consultationsCount,
            subtitle: `+${stats.consultationsThisWeek} w tym tygodniu`,
            icon: EventNote,
            color: '#f5576c',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            progress: stats.consultationsThisWeek > 0 ? (stats.consultationsThisWeek / stats.consultationsCount) * 100 : 0,
        },
        {
            title: 'Wiadomości',
            value: stats.emailsSentCount,
            subtitle: 'Wysłanych emaili',
            icon: Email,
            color: '#00f2fe',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            progress: 0,
        },
        {
            title: 'Bez konsultacji',
            value: stats.patientsWithoutConsultation,
            subtitle: 'Wymaga uwagi',
            icon: Warning,
            color: '#fee140',
            gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            progress: stats.patientsWithoutConsultation > 0 ? (stats.patientsWithoutConsultation / stats.patientsCount) * 100 : 0,
        },
    ];

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header Section */}
            <Box sx={{ mb: { xs: 3, sm: 4 }, px: { xs: 1, sm: 0 } }}>
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
                    onChange={(e) => handleSearch(e.target.value)}
                    size={isMobile ? 'small' : 'medium'}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: '#667eea' }} />
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
                                onClick={() => navigate(`/patients/${patient.id}`)}
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

            {/* Patients Needing Attention */}
            {(patientsNeedingAttention.length > 0 || inactivePatientsList.length > 0) && (
                <Grid container spacing={3} sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
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
            )}

            {/* Upcoming Visits and Weekly Revenue */}
            <Grid container spacing={3} sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
                {/* Upcoming Visits */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper
                        sx={{
                            p: { xs: 2, sm: 3 },
                            background: 'white',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: alpha('#AF52DE', 0.3),
                            boxShadow: `0 8px 24px ${alpha('#AF52DE', 0.1)}`,
                            height: '100%',
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
                        {upcomingVisits.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <EventAvailable sx={{ fontSize: 48, color: '#d2d2d7', mb: 1 }} />
                                <Typography variant="body1" color="text.secondary">
                                    Brak nadchodzących wizyt
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{ p: 0 }}>
                                {upcomingVisits.map((visit, index) => {
                                    const statusConfig = visitStatusConfig[visit.status] || visitStatusConfig.ZAPLANOWANA;
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
                                                            <Box
                                                                sx={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    bgcolor: statusConfig.color,
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
                                                                {format(new Date(visit.data), 'dd MMM, HH:mm', { locale: pl })}
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
                        )}
                    </Paper>
                </Grid>

                {/* Weekly Revenue */}
                <Grid size={{ xs: 12, md: 4 }}>
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
                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                                Przychody w tym tygodniu
                            </Typography>
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                    {weeklyRevenue.completedRevenue.toFixed(0)} zł
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    Zrealizowane
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                    {weeklyRevenue.plannedRevenue.toFixed(0)} zł
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    Zaplanowane
                                </Typography>
                            </Box>
                        </Box>
                        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    {weeklyRevenue.visitsThisWeek.odbyta}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    Odbyte
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    {weeklyRevenue.visitsThisWeek.zaplanowana}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    Zaplanowane
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
                {statCards.map((stat, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card
                            sx={{
                                position: 'relative',
                                overflow: 'visible',
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                background: 'white',
                                height: '100%',
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

            {/* Content Grid */}
            <Grid container spacing={3} sx={{ px: { xs: 1, sm: 0 } }}>
                {/* Recent Activity */}
                <Grid size={{ xs: 12, md: 8 }}>
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
                        {recentActivities.length === 0 ? (
                            <Box sx={{
                                textAlign: 'center',
                                py: 8,
                                color: 'text.secondary'
                            }}>
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                    Brak ostatniej aktywności
                                </Typography>
                                <Typography variant="body2">
                                    Dodaj pierwszego pacjenta lub konsultację, aby zobaczyć aktywność
                                </Typography>
                            </Box>
                        ) : (
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
                        )}
                    </Paper>
                </Grid>

                {/* Quick Actions */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                        sx={{
                            p: { xs: 2.5, sm: 4 },
                            height: '100%',
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            boxShadow: `0 8px 24px ${alpha('#667eea', 0.25)}`,
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: 'white' }}>
                            Szybkie akcje
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 4, opacity: 0.9 }}>
                            Najczęściej używane funkcje systemu
                        </Typography>
                        <List sx={{ p: 0 }}>
                            <ListItemButton
                                onClick={() => navigate('/patients/new')}
                                sx={{
                                    mb: 2,
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
                                onClick={() => navigate('/patients')}
                                sx={{
                                    mb: 2,
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
                                    <Email sx={{ color: 'white' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Zarządzaj pacjentami"
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
            </Grid>
        </Box>
    );
}
