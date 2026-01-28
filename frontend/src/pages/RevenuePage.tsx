import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    IconButton,
    useTheme,
    useMediaQuery,
    alpha,
    Divider,
} from '@mui/material';
import {
    AttachMoney,
    Refresh,
    TrendingUp,
} from '@mui/icons-material';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNotification } from '../hooks/useNotification';

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

export default function RevenuePage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { error: showError } = useNotification();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyRevenue>({
        plannedRevenue: 0,
        completedRevenue: 0,
        totalExpectedRevenue: 0,
        visitsThisWeek: { zaplanowana: 0, odbyta: 0, nieobecnosc: 0, anulowana: 0 },
    });

    const fetchRevenueData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const dashboardRes = await api.get('/dashboard');
            const dashboardData = dashboardRes.data;

            setWeeklyRevenue(dashboardData.weeklyRevenue || {
                plannedRevenue: 0,
                completedRevenue: 0,
                totalExpectedRevenue: 0,
                visitsThisWeek: { zaplanowana: 0, odbyta: 0, nieobecnosc: 0, anulowana: 0 },
            });
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Nie udało się załadować danych przychodów';
            setError(errorMessage);
            showError(errorMessage);
            console.error('Failed to fetch revenue data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRevenueData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const getWeekStart = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        return new Date(now.setDate(diff));
    };

    const getWeekEnd = () => {
        const start = getWeekStart();
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return end;
    };

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
                        Przychody
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {format(getWeekStart(), 'dd MMMM', { locale: pl })} - {format(getWeekEnd(), 'dd MMMM yyyy', { locale: pl })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        onClick={() => fetchRevenueData(true)}
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
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, mx: { xs: 1, sm: 0 } }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Main Revenue Card */}
            <Grid container spacing={3} sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
                <Grid size={{ xs: 12 }}>
                    <Paper
                        sx={{
                            p: { xs: 2.5, sm: 4 },
                            borderRadius: 3,
                            background: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '12px',
                                    background: alpha('#1976d2', 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <AttachMoney sx={{ fontSize: 32, color: '#1976d2' }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    Przychody w tym tygodniu
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {format(getWeekStart(), 'dd MMM', { locale: pl })} - {format(getWeekEnd(), 'dd MMM', { locale: pl })}
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ mb: 4, textAlign: 'center' }}>
                            <Typography variant="h2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary', fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>
                                {weeklyRevenue.totalExpectedRevenue.toFixed(0)} zł
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                Oczekiwany przychód
                            </Typography>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Paper
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        background: alpha('#34C759', 0.05),
                                        border: '1px solid',
                                        borderColor: alpha('#34C759', 0.2),
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <TrendingUp sx={{ color: '#34C759', fontSize: 24 }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Zrealizowane
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#34C759', mb: 0.5 }}>
                                        {weeklyRevenue.completedRevenue.toFixed(0)} zł
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {weeklyRevenue.visitsThisWeek.odbyta} {weeklyRevenue.visitsThisWeek.odbyta === 1 ? 'wizyta' : 'wizyt'}
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Paper
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        background: alpha('#1976d2', 0.05),
                                        border: '1px solid',
                                        borderColor: alpha('#1976d2', 0.2),
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <AttachMoney sx={{ color: '#1976d2', fontSize: 24 }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Zaplanowane
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}>
                                        {weeklyRevenue.plannedRevenue.toFixed(0)} zł
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {weeklyRevenue.visitsThisWeek.zaplanowana} {weeklyRevenue.visitsThisWeek.zaplanowana === 1 ? 'wizyta' : 'wizyt'}
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Paper
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        background: alpha('#FF9500', 0.05),
                                        border: '1px solid',
                                        borderColor: alpha('#FF9500', 0.2),
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Nieobecności
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#FF9500', mb: 0.5 }}>
                                        {weeklyRevenue.visitsThisWeek.nieobecnosc}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        wizyt
                                    </Typography>
                                </Paper>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                <Paper
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        background: alpha('#d32f2f', 0.05),
                                        border: '1px solid',
                                        borderColor: alpha('#d32f2f', 0.2),
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Anulowane
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#d32f2f', mb: 0.5 }}>
                                        {weeklyRevenue.visitsThisWeek.anulowana}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        wizyt
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
