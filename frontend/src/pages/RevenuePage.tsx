import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    IconButton,
    alpha,
    Divider,
    Tooltip,
    Stack,
    TextField,
    Chip,
} from '@mui/material';
import {
    AttachMoney,
    Refresh,
    TrendingUp,
    EventNote,
    PersonAdd,
    CheckCircle,
    Cancel,
} from '@mui/icons-material';
import { api } from '../services/api';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNotification } from '../hooks/useNotification';

interface TimelineBucket {
    date: string;
    planned: number;
    completed: number;
    total: number;
}

interface RevenueSummary {
    plannedRevenue: number;
    completedRevenue: number;
    totalRevenue: number;
    newPatients: number;
    granularity: 'daily' | 'weekly';
    statusSummary: Record<string, { count: number; revenue: number }>;
}

interface RevenueData {
    range: { from: string; to: string };
    summary: RevenueSummary;
    timeline: TimelineBucket[];
}

const PRESETS = [
    { label: 'Ten tydzień', days: 7 },
    { label: '30 dni', days: 30 },
    { label: '90 dni', days: 90 },
    { label: 'Ten rok', days: 365 },
    { label: 'Niestandardowy', days: -1 },
];

function toInputDate(d: Date) {
    return d.toISOString().slice(0, 10);
}

export default function RevenuePage() {
    const { error: showError } = useNotification();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<RevenueData | null>(null);

    const [activePreset, setActivePreset] = useState(1); // default: 30 dni
    const [fromDate, setFromDate] = useState(toInputDate(subDays(new Date(), 30)));
    const [toDate, setToDate] = useState(toInputDate(new Date()));

    const fetchRevenue = useCallback(async (from: string, to: string, isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const res = await api.get(`/dashboard/revenue?from=${from}&to=${to}`);
            setData(res.data);
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Nie udało się załadować danych przychodów';
            setError(msg);
            showError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showError]);

    // Initial load
    useEffect(() => {
        fetchRevenue(fromDate, toDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePreset = (idx: number) => {
        setActivePreset(idx);
        if (idx === 4) return; // custom — let user pick dates manually
        const preset = PRESETS[idx];
        const to = new Date();
        const from = subDays(to, preset.days - 1);
        const fromStr = toInputDate(from);
        const toStr = toInputDate(to);
        setFromDate(fromStr);
        setToDate(toStr);
        fetchRevenue(fromStr, toStr);
    };

    const handleApplyCustom = () => {
        fetchRevenue(fromDate, toDate);
    };

    const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
    const fmtDate = (s: string) => {
        const d = new Date(s);
        return data?.summary.granularity === 'weekly'
            ? `${format(d, 'dd MMM', { locale: pl })}`
            : format(d, 'dd MMM', { locale: pl });
    };

    const summary = data?.summary;
    const timeline = data?.timeline ?? [];
    const maxVal = Math.max(...timeline.map(b => b.total), 1);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1d1d1f', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                        Przychody
                    </Typography>
                    {data && (
                        <Typography variant="body2" color="text.secondary">
                            {format(new Date(data.range.from), 'dd MMMM yyyy', { locale: pl })} –{' '}
                            {format(new Date(data.range.to), 'dd MMMM yyyy', { locale: pl })}
                        </Typography>
                    )}
                </Box>
                <Tooltip title="Odśwież">
                    <IconButton
                        onClick={() => fetchRevenue(fromDate, toDate, true)}
                        disabled={refreshing}
                        sx={{ bgcolor: alpha('#007AFF', 0.08), '&:hover': { bgcolor: alpha('#007AFF', 0.14) } }}
                    >
                        <Refresh sx={{
                            color: '#007AFF',
                            animation: refreshing ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                        }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Period Selector */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {PRESETS.map((p, idx) => (
                            <Chip
                                key={idx}
                                label={p.label}
                                onClick={() => handlePreset(idx)}
                                variant={activePreset === idx ? 'filled' : 'outlined'}
                                sx={{
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    bgcolor: activePreset === idx ? '#007AFF' : 'transparent',
                                    color: activePreset === idx ? 'white' : 'inherit',
                                    borderColor: activePreset === idx ? '#007AFF' : 'divider',
                                    '&:hover': { bgcolor: activePreset === idx ? '#0056D6' : alpha('#007AFF', 0.08) },
                                }}
                            />
                        ))}
                    </Stack>

                    {activePreset === 4 && (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                            <TextField
                                type="date"
                                size="small"
                                label="Od"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ minWidth: 150 }}
                            />
                            <TextField
                                type="date"
                                size="small"
                                label="Do"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ minWidth: 150 }}
                            />
                            <Chip
                                label="Zastosuj"
                                onClick={handleApplyCustom}
                                sx={{
                                    fontWeight: 700, cursor: 'pointer',
                                    bgcolor: '#34C759', color: 'white',
                                    '&:hover': { bgcolor: '#2DA047' },
                                }}
                            />
                        </Stack>
                    )}
                </Stack>
            </Paper>

            {/* KPI Cards */}
            <Grid container spacing={{ xs: 1.5, md: 2.5 }} sx={{ mb: 3 }}>
                {[
                    { label: 'Łączny przychód', value: `${fmt(summary?.totalRevenue ?? 0)} zł`, color: '#007AFF', icon: AttachMoney },
                    { label: 'Zrealizowany', value: `${fmt(summary?.completedRevenue ?? 0)} zł`, color: '#34C759', icon: CheckCircle },
                    { label: 'Zaplanowany', value: `${fmt(summary?.plannedRevenue ?? 0)} zł`, color: '#FF9500', icon: TrendingUp },
                    { label: 'Nowi pacjenci', value: summary?.newPatients ?? 0, color: '#AF52DE', icon: PersonAdd },
                    { label: 'Wizyty odbyte', value: summary?.statusSummary?.['ODBYTA']?.count ?? 0, color: '#34C759', icon: EventNote },
                    { label: 'Anulowane', value: summary?.statusSummary?.['ANULOWANA']?.count ?? 0, color: '#FF3B30', icon: Cancel },
                ].map((kpi, i) => (
                    <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
                        <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2.5 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: alpha(kpi.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                                <kpi.icon sx={{ color: kpi.color, fontSize: 20 }} />
                            </Box>
                            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', md: '1.5rem' }, color: '#1d1d1f', lineHeight: 1.1 }}>
                                {kpi.value}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.5, display: 'block', fontSize: { xs: '0.62rem', md: '0.7rem' } }}>
                                {kpi.label}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Bar Chart */}
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1d1d1f', mb: 0.5, fontSize: { xs: '1rem', md: '1.1rem' } }}>
                    Przychody w czasie
                </Typography>
                <Typography variant="body2" sx={{ color: '#86868b', mb: 3 }}>
                    {summary?.granularity === 'weekly' ? 'Tygodniowo' : 'Dziennie'} •{' '}
                    <Box component="span" sx={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <Box component="span" sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#34C759', display: 'inline-block' }} />
                            Zrealizowane
                        </Box>
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <Box component="span" sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: alpha('#007AFF', 0.5), display: 'inline-block' }} />
                            Zaplanowane
                        </Box>
                    </Box>
                </Typography>

                {timeline.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: '#86868b' }}>
                        <EventNote sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                        <Typography>Brak danych w wybranym okresie</Typography>
                    </Box>
                ) : (
                    <>
                        {/* Y-axis labels + bars */}
                        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'flex-end', height: { xs: 180, md: 240 }, overflow: 'visible' }}>
                            {/* Y-axis */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', pr: 0.5, minWidth: { xs: 36, md: 52 } }}>
                                {[maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((v, i) => (
                                    <Typography key={i} variant="caption" sx={{ color: '#86868b', fontSize: { xs: '0.55rem', md: '0.7rem' }, textAlign: 'right', lineHeight: 1 }}>
                                        {v > 0 ? `${Math.round(v / 100) * 100}` : '0'}
                                    </Typography>
                                ))}
                            </Box>

                            {/* Bars */}
                            <Box sx={{ flex: 1, display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'flex-end', height: '100%', overflowX: 'auto', pb: 0.5 }}>
                                {timeline.map((bucket, idx) => (
                                    <Tooltip
                                        key={idx}
                                        title={
                                            <Box>
                                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{fmtDate(bucket.date)}</Typography>
                                                <Typography variant="caption" sx={{ display: 'block', color: '#34C759' }}>Zrealizowane: {fmt(bucket.completed)} zł</Typography>
                                                <Typography variant="caption" sx={{ display: 'block', color: '#007AFF' }}>Zaplanowane: {fmt(bucket.planned)} zł</Typography>
                                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>Razem: {fmt(bucket.total)} zł</Typography>
                                            </Box>
                                        }
                                        arrow
                                    >
                                        <Box sx={{ flex: 1, minWidth: { xs: 8, sm: 12 }, maxWidth: 40, display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}>
                                            {/* Planned on top */}
                                            {bucket.planned > 0 && (
                                                <Box sx={{
                                                    height: `${(bucket.planned / maxVal) * 100}%`,
                                                    bgcolor: alpha('#007AFF', 0.45),
                                                    borderRadius: '4px 4px 0 0',
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': { bgcolor: alpha('#007AFF', 0.65) },
                                                }} />
                                            )}
                                            {/* Completed */}
                                            <Box sx={{
                                                height: `${(bucket.completed / maxVal) * 100}%`,
                                                bgcolor: '#34C759',
                                                borderRadius: bucket.planned > 0 ? '0' : '4px 4px 0 0',
                                                minHeight: bucket.completed > 0 ? 2 : 0,
                                                transition: 'all 0.3s ease',
                                                '&:hover': { bgcolor: '#2DA047' },
                                            }} />
                                        </Box>
                                    </Tooltip>
                                ))}
                            </Box>
                        </Box>

                        {/* X-axis labels */}
                        <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, ml: { xs: '44px', md: '60px' }, mt: 1, overflowX: 'auto' }}>
                            {timeline.map((bucket, idx) => {
                                const showEvery = Math.ceil(timeline.length / 10);
                                if (idx % showEvery !== 0 && idx !== timeline.length - 1) return <Box key={idx} sx={{ flex: 1, minWidth: { xs: 8, sm: 12 }, maxWidth: 40 }} />;
                                return (
                                    <Typography key={idx} variant="caption" sx={{ flex: 1, minWidth: { xs: 8, sm: 12 }, maxWidth: 40, textAlign: 'center', color: '#86868b', fontSize: { xs: '0.55rem', md: '0.65rem' }, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                        {fmtDate(bucket.date)}
                                    </Typography>
                                );
                            })}
                        </Box>
                    </>
                )}

                {timeline.length > 0 && (
                    <>
                        <Divider sx={{ my: 2.5 }} />
                        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Najlepszy dzień</Typography>
                                <Typography sx={{ fontWeight: 700, color: '#1d1d1f', mt: 0.5 }}>
                                    {(() => { const best = [...timeline].sort((a, b) => b.total - a.total)[0]; return best ? `${fmtDate(best.date)} — ${fmt(best.total)} zł` : '—'; })()}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Średnio na dzień</Typography>
                                <Typography sx={{ fontWeight: 700, color: '#1d1d1f', mt: 0.5 }}>
                                    {fmt((summary?.totalRevenue ?? 0) / Math.max(timeline.length, 1))} zł
                                </Typography>
                            </Box>
                        </Box>
                    </>
                )}
            </Paper>
        </Box>
    );
}
