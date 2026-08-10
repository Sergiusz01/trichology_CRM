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
    Button,
    ToggleButton,
    ToggleButtonGroup,
    Skeleton,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    AttachMoney,
    Refresh,
    TrendingUp,
    EventNote,
    PersonAdd,
    CheckCircle,
    Cancel,
    PictureAsPdf,
    BarChart as BarChartIcon,
} from '@mui/icons-material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts';
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
    const { error: showError, success: showSuccess } = useNotification();
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

    const handleDownloadReport = async () => {
        try {
            setLoading(true);
            const monthStr = fromDate.substring(0, 7); // Extracts YYYY-MM
            const response = await api.get(`/reports/monthly?month=${monthStr}`, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Raport_${monthStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            showSuccess('Raport został pobrany pomyślnie.');
        } catch (err: any) {
            showError('Błąd podczas generowania raportu PDF');
        } finally {
            setLoading(false);
        }
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

    const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));

    if (loading) {
        return (
            <Box sx={{ pb: 4, pt: { xs: 2, md: 3 } }}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                        <Skeleton width={120} height={32} />
                        <Skeleton width={200} height={20} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Skeleton variant="rounded" width={isMobile ? 32 : 120} height={32} />
                        <Skeleton variant="rounded" width={32} height={32} />
                    </Box>
                </Box>
                <Skeleton variant="rounded" width={400} height={40} sx={{ mb: 3 }} />
                <Skeleton variant="rounded" width="100%" height={100} sx={{ mb: 3 }} />
                <Skeleton variant="rounded" width="100%" height={300} />
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 4, pt: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5, fontSize: { xs: '20px', md: '22px' } }}>
                        Przychody
                    </Typography>
                    {data && (
                        <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                            {format(new Date(data.range.from), 'd MMMM', { locale: pl })} –{' '}
                            {format(new Date(data.range.to), 'd MMMM yyyy', { locale: pl })}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleDownloadReport}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} /> : <PictureAsPdf sx={{ fontSize: 16 }} />}
                        sx={{
                            color: 'text.secondary',
                            borderColor: 'divider',
                            textTransform: 'none',
                            fontWeight: 500,
                            height: 32,
                            px: 2,
                            ...(isMobile && { minWidth: 32, px: 0, '& .MuiButton-startIcon': { margin: 0 }, '& .MuiButton-startIcon > *:first-of-type': { fontSize: 16 } })
                        }}
                    >
                        {!isMobile && (loading ? 'Generowanie...' : 'Eksportuj PDF')}
                    </Button>
                    <IconButton
                        size="small"
                        onClick={() => fetchRevenue(fromDate, toDate, true)}
                        disabled={refreshing}
                        sx={{
                            width: 32,
                            height: 32,
                            color: 'text.secondary',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                        }}
                    >
                        <Refresh sx={{
                            fontSize: 18,
                            animation: refreshing ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                        }} />
                    </IconButton>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>Nie udało się wczytać danych. Spróbuj ponownie.</Alert>}

            {/* Period Selector */}
            <Box sx={{ mb: 3, display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }} role="group" aria-label="Zakres dat">
                <ToggleButtonGroup
                    size="small"
                    value={activePreset}
                    exclusive
                    onChange={(_, val) => val !== null && handlePreset(val)}
                    sx={{
                        bgcolor: 'transparent',
                        '& .MuiToggleButton-root': {
                            border: '1px solid',
                            borderColor: 'divider',
                            textTransform: 'none',
                            fontWeight: 400,
                            color: 'text.secondary',
                            px: 2,
                            height: 32,
                            whiteSpace: 'nowrap',
                            '&.Mui-selected': {
                                bgcolor: 'action.selected',
                                color: 'text.primary',
                                fontWeight: 500,
                            },
                        },
                        '& .MuiToggleButtonGroup-grouped:first-of-type': {
                            borderTopLeftRadius: 8,
                            borderBottomLeftRadius: 8,
                        },
                        '& .MuiToggleButtonGroup-grouped:last-of-type': {
                            borderTopRightRadius: 8,
                            borderBottomRightRadius: 8,
                        }
                    }}
                >
                    {PRESETS.map((p, idx) => (
                        <ToggleButton key={idx} value={idx} aria-pressed={activePreset === idx}>
                            {p.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                {activePreset === 4 && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
                        <TextField
                            type="date"
                            size="small"
                            label="Od"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 130, '& .MuiInputBase-root': { height: 32, fontSize: '13px' }, '& .MuiInputLabel-root': { top: -4 } }}
                        />
                        <TextField
                            type="date"
                            size="small"
                            label="Do"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 130, '& .MuiInputBase-root': { height: 32, fontSize: '13px' }, '& .MuiInputLabel-root': { top: -4 } }}
                        />
                        <Button
                            variant="contained"
                            disableElevation
                            size="small"
                            onClick={handleApplyCustom}
                            sx={{ height: 32, textTransform: 'none', fontWeight: 500 }}
                        >
                            Zastosuj
                        </Button>
                    </Stack>
                )}
            </Box>

            {/* KPI Cards */}
            <Paper variant="outlined" sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: '1.4fr repeat(5, 1fr)' },
                        '& > div': {
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            height: 80,
                            p: 2,
                            borderRight: { xs: 'none', md: '1px solid divider' },
                            borderBottom: { xs: '1px solid divider', md: 'none' },
                            borderColor: 'divider',
                            '&:last-child': { borderRight: 'none', borderBottom: 'none' },
                            ...(isMobile && {
                                '&:nth-of-type(1)': { gridColumn: 'span 2' },
                                '&:nth-of-type(2n+1)': { borderRight: '1px solid divider' },
                                '&:nth-of-type(2n)': { borderRight: 'none' },
                                '&:nth-of-type(5)': { borderBottom: 'none' },
                                '&:nth-of-type(6)': { borderBottom: 'none' },
                            })
                        },
                    }}
                >
                    {[
                        { label: 'Łączny przychód', value: `${fmt(summary?.totalRevenue ?? 0)} zł`, icon: AttachMoney, isPrimary: true },
                        { label: 'Zrealizowany', value: `${fmt(summary?.completedRevenue ?? 0)} zł`, icon: CheckCircle },
                        { label: 'Zaplanowany', value: `${fmt(summary?.plannedRevenue ?? 0)} zł`, icon: TrendingUp },
                        { label: 'Nowi pacjenci', value: summary?.newPatients ?? 0, icon: PersonAdd },
                        { label: 'Wizyty odbyte', value: summary?.statusSummary?.['ODBYTA']?.count ?? 0, icon: EventNote },
                        { label: 'Anulowane', value: summary?.statusSummary?.['ANULOWANA']?.count ?? 0, icon: Cancel, isCancel: true },
                    ].map((kpi, i) => {
                        const isZero = kpi.value === '0 zł' || kpi.value === 0;
                        const isCancelHighlight = kpi.isCancel && !isZero;
                        return (
                            <Box
                                key={i}
                                aria-label={`${kpi.label}: ${kpi.value}`}
                                sx={{
                                    alignItems: kpi.isPrimary && !isMobile ? 'flex-start' : 'center',
                                    position: 'relative',
                                    ...(isCancelHighlight && {
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: 2,
                                            bgcolor: 'error.main'
                                        }
                                    })
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <kpi.icon sx={{ fontSize: kpi.isPrimary ? 18 : 16, color: isCancelHighlight ? 'error.main' : isZero ? 'text.disabled' : 'text.secondary' }} />
                                    <Typography
                                        sx={{
                                            fontWeight: 500,
                                            fontSize: kpi.isPrimary ? '24px' : '18px',
                                            color: isCancelHighlight ? 'error.main' : isZero ? 'text.disabled' : 'text.primary',
                                            lineHeight: 1
                                        }}
                                    >
                                        {kpi.value}
                                    </Typography>
                                </Box>
                                <Typography
                                    sx={{
                                        color: isZero && !kpi.isPrimary ? 'text.disabled' : 'text.secondary',
                                        fontSize: kpi.isPrimary ? '12px' : '11px',
                                        fontWeight: 400
                                    }}
                                >
                                    {kpi.label}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Paper>

            {/* Bar Chart */}
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography sx={{ fontWeight: 500, color: 'text.primary', fontSize: '13px' }}>
                        Przychody w czasie
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, bgcolor: 'success.main', opacity: 0.8 }} />
                            <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>Zrealizowane</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, bgcolor: 'info.main', opacity: 0.8 }} />
                            <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>Zaplanowane</Typography>
                        </Box>
                    </Box>
                </Box>

                {timeline.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.muted' }}>
                        <BarChartIcon sx={{ fontSize: 24, mb: 1, opacity: 0.5 }} />
                        <Typography sx={{ fontSize: '13px' }}>Brak danych w wybranym okresie</Typography>
                    </Box>
                ) : (
                    <>
                        <Box sx={{ height: { xs: 200, md: 240 }, width: '100%', mt: 2 }} role="img" aria-label={`Wykres przychodów ${summary?.granularity === 'weekly' ? 'tygodniowo' : 'dziennie'}`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={timeline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e0e0e0)" />
                                    <XAxis 
                                        dataKey="date" 
                                        tickFormatter={fmtDate} 
                                        tick={{ fill: '#86868b', fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={20}
                                    />
                                    <YAxis 
                                        tickFormatter={(val) => val === 0 ? '0' : `${fmt(val)} zł`} 
                                        tick={{ fill: '#86868b', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={60}
                                    />
                                    <RechartsTooltip 
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const pl = payload.find(p => p.dataKey === 'planned')?.value as number || 0;
                                                const cm = payload.find(p => p.dataKey === 'completed')?.value as number || 0;
                                                return (
                                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                                                        <Typography sx={{ fontSize: '12px', fontWeight: 600, mb: 1 }}>{fmtDate(label)}</Typography>
                                                        <Typography sx={{ fontSize: '12px', color: 'success.main', mb: 0.5 }}>Zrealizowane: {fmt(cm)} zł</Typography>
                                                        <Typography sx={{ fontSize: '12px', color: 'info.main', mb: 1 }}>Zaplanowane: {fmt(pl)} zł</Typography>
                                                        <Divider sx={{ my: 0.5 }} />
                                                        <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>Razem: {fmt(cm + pl)} zł</Typography>
                                                    </Paper>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="completed" stackId="a" fill="currentColor" className="recharts-bar-completed" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                                    <Bar dataKey="planned" stackId="a" fill="currentColor" className="recharts-bar-planned" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                        {/* We use CSS to target the bars since Recharts sometimes has issues passing theme colors directly to fill if they are string refs */}
                        <style>{`
                            .recharts-bar-completed path { fill: var(--mui-palette-success-main, #34C759); opacity: 0.8; }
                            .recharts-bar-planned path { fill: var(--mui-palette-info-main, #007AFF); opacity: 0.8; }
                        `}</style>

                        <Divider sx={{ my: 2.5 }} />
                        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Box>
                                <Typography sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 400 }}>Najlepszy dzień</Typography>
                                <Typography sx={{ fontWeight: 500, color: 'text.primary', mt: 0.5, fontSize: '14px' }}>
                                    {(() => { const best = [...timeline].sort((a, b) => b.total - a.total)[0]; return best ? `${fmtDate(best.date)} — ${fmt(best.total)} zł` : '—'; })()}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography sx={{ color: 'text.secondary', fontSize: '11px', fontWeight: 400 }}>Średnio na dzień</Typography>
                                <Typography sx={{ fontWeight: 500, color: 'text.primary', mt: 0.5, fontSize: '14px' }}>
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
