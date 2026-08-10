import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Button, Chip, Divider, alpha, useTheme, useMediaQuery,
    ToggleButtonGroup, ToggleButton, Skeleton,
} from '@mui/material';
import { ChevronRight, CalendarToday } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface UpcomingVisit {
    id: string;
    data: string;
    rodzajZabiegu: string;
    status: string;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

const STATUS_COLORS: Record<string, string> = {
    ZAPLANOWANA: '#0A84FF',
    ODBYTA: '#34C759',
    NIEOBECNOSC: '#FF9500',
    ANULOWANA: '#FF3B30',
};

const STATUS_LABELS: Record<string, string> = {
    ZAPLANOWANA: 'zaplanowana',
    ODBYTA: 'odbyta',
    NIEOBECNOSC: 'nieobecność',
    ANULOWANA: 'anulowana',
};

function formatTimeUTC(dateString: string): string {
    const d = new Date(dateString);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function getDayLabel(date: Date, today: Date, tomorrow: Date): string {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const tm = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate()));

    if (d.getTime() === t.getTime()) {
        return `Dziś, ${date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`;
    }
    if (d.getTime() === tm.getTime()) {
        return `Jutro, ${date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`;
    }
    return date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

function getDayKey(date: Date): string {
    return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

interface AgendaWidgetProps {
    visits: UpcomingVisit[];
    loading?: boolean;
}

export const AgendaWidget: React.FC<AgendaWidgetProps> = ({ visits, loading }) => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const now = useMemo(() => new Date(), []);
    const today = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
    const tomorrow = useMemo(() => {
        const t = new Date(today);
        t.setDate(t.getDate() + 1);
        return t;
    }, [today]);

    const todayVisits = useMemo(() =>
        visits.filter(v => {
            const d = new Date(v.data);
            return d >= today && d < tomorrow;
        }),
        [visits, today, tomorrow]
    );

    const hasToday = todayVisits.length > 0;
    const [range, setRange] = useState<'today' | 'week'>(hasToday ? 'today' : 'week');

    useEffect(() => {
        if (!hasToday && range === 'today') setRange('week');
    }, [hasToday, range]);

    const filteredVisits = range === 'today' ? todayVisits : visits;

    // Group visits by day
    const groupedVisits = useMemo(() => {
        const groups: { key: string; label: string; visits: UpcomingVisit[] }[] = [];
        let currentKey = '';
        for (const visit of filteredVisits) {
            const d = new Date(visit.data);
            const key = getDayKey(d);
            if (key !== currentKey) {
                currentKey = key;
                groups.push({ key, label: getDayLabel(d, today, tomorrow), visits: [] });
            }
            groups[groups.length - 1].visits.push(visit);
        }
        return groups;
    }, [filteredVisits, today, tomorrow]);

    // "Now" marker
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
        return () => clearInterval(interval);
    }, []);

    const nowTimeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

    // Find "next" upcoming visit for highlight
    const nextVisitId = useMemo(() => {
        const nowMs = Date.now();
        for (const v of filteredVisits) {
            if (new Date(v.data).getTime() > nowMs && v.status === 'ZAPLANOWANA') return v.id;
        }
        return null;
    }, [filteredVisits]);

    const upcomingCount = filteredVisits.filter(v => v.status === 'ZAPLANOWANA').length;

    if (loading) {
        return (
            <Box sx={{ p: { xs: 0, sm: 3 }, borderRadius: { xs: 0, sm: 3 }, border: { xs: 'none', sm: '1px solid' }, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: { xs: 2, sm: 0 } }}>
                    <Skeleton width={120} height={28} />
                    <Skeleton width={140} height={32} />
                </Box>
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} height={isMobile ? 72 : 56} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: { xs: 'none', sm: '1px solid' },
                borderColor: 'divider',
                borderRadius: { xs: 0, sm: 3 },
                mx: { xs: -2, sm: 0 },
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: { xs: 2, sm: 3 }, py: 2,
                borderBottom: '1px solid', borderColor: 'divider',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary' }}>
                        Agenda
                    </Typography>
                    {upcomingCount > 0 && (
                        <Chip
                            label={upcomingCount}
                            size="small"
                            sx={{
                                height: 20, fontSize: '0.7rem', fontWeight: 700,
                                bgcolor: alpha('#0A84FF', 0.1), color: '#0A84FF',
                            }}
                        />
                    )}
                </Box>
                <ToggleButtonGroup
                    value={range}
                    exclusive
                    onChange={(_, v) => v && setRange(v)}
                    size="small"
                    sx={{
                        height: 28,
                        '& .MuiToggleButton-root': {
                            fontSize: '0.75rem', fontWeight: 600, px: 1.5, py: 0,
                            textTransform: 'none', borderRadius: '6px !important',
                            border: 'none', color: 'text.secondary',
                            '&.Mui-selected': { bgcolor: alpha('#0A84FF', 0.1), color: '#0A84FF' },
                        },
                    }}
                >
                    <ToggleButton value="today" disabled={!hasToday}>Dziś</ToggleButton>
                    <ToggleButton value="week">7 dni</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Info when no today visits */}
            {!hasToday && range === 'week' && filteredVisits.length > 0 && (
                <Box sx={{ px: { xs: 2, sm: 3 }, py: 1, bgcolor: alpha('#FF9500', 0.04), borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography sx={{ fontSize: 12, color: '#FF9500', fontWeight: 500 }}>
                        Brak wizyt dziś — pokazuję najbliższe
                    </Typography>
                </Box>
            )}

            {/* Empty state */}
            {filteredVisits.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CalendarToday sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
                    <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>
                        Brak zaplanowanych wizyt
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/visits/new')}
                        sx={{ textTransform: 'none', fontSize: 13 }}
                    >
                        Zaplanuj wizytę
                    </Button>
                </Box>
            ) : (
                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }} aria-label="Agenda wizyt">
                    {groupedVisits.map((group) => (
                        <Box component="li" key={group.key} role="presentation">
                            {/* Day header */}
                            <Box sx={{
                                position: 'sticky', top: 0, zIndex: 1,
                                px: { xs: 2, sm: 3 }, py: 0.75,
                                bgcolor: '#F6F8FA',
                                borderBottom: '1px solid', borderColor: 'divider',
                            }}>
                                <Typography sx={{
                                    fontSize: 11, fontWeight: 600, color: 'text.secondary',
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>
                                    {group.label}
                                </Typography>
                            </Box>

                            {/* Visits */}
                            {group.visits.map((visit, idx) => {
                                const isNext = visit.id === nextVisitId;
                                const isDone = visit.status === 'ODBYTA' || visit.status === 'ANULOWANA';
                                const statusColor = STATUS_COLORS[visit.status] || '#5A6B7A';

                                return (
                                    <React.Fragment key={visit.id}>
                                        {idx > 0 && <Divider sx={{ mx: { xs: 2, sm: 3 } }} />}
                                        <Box
                                            component="li"
                                            onClick={() => navigate(`/patients/${visit.patient.id}`)}
                                            aria-label={`${formatTimeUTC(visit.data)}, ${visit.patient.firstName} ${visit.patient.lastName}, ${visit.rodzajZabiegu}, ${STATUS_LABELS[visit.status] || visit.status}`}
                                            tabIndex={0}
                                            role="button"
                                            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') navigate(`/patients/${visit.patient.id}`); }}
                                            sx={{
                                                display: 'flex',
                                                alignItems: { xs: 'flex-start', sm: 'center' },
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gap: { xs: 0.25, sm: 2 },
                                                px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 1 },
                                                minHeight: { xs: 72, sm: 56 },
                                                cursor: 'pointer',
                                                bgcolor: isNext ? alpha('#0A84FF', 0.03) : 'transparent',
                                                transition: 'background-color 120ms ease-out',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                '&:focus-visible': {
                                                    outline: `2px solid ${theme.palette.primary.main}`,
                                                    outlineOffset: -2,
                                                },
                                                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                                            }}
                                        >
                                            {/* Time */}
                                            <Typography sx={{
                                                fontSize: 15, fontWeight: isNext ? 700 : 600,
                                                color: isDone ? 'text.disabled' : (isNext ? '#0A84FF' : 'text.primary'),
                                                fontVariantNumeric: 'tabular-nums',
                                                minWidth: { sm: 50 }, flexShrink: 0,
                                            }}>
                                                {formatTimeUTC(visit.data)}
                                            </Typography>

                                            {/* Content */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    lang="pl"
                                                    sx={{
                                                        fontSize: 15, fontWeight: 600,
                                                        color: isDone ? 'text.disabled' : 'text.primary',
                                                        textTransform: 'none',
                                                        overflowWrap: 'anywhere',
                                                        hyphens: 'auto',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        lineHeight: 1.3,
                                                    }}
                                                >
                                                    {visit.patient.firstName} {visit.patient.lastName}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                                    <Typography sx={{
                                                        fontSize: 13, fontWeight: 400,
                                                        color: isDone ? 'text.disabled' : 'text.secondary',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        minWidth: 0,
                                                    }}>
                                                        {visit.rodzajZabiegu}
                                                    </Typography>
                                                    <Typography sx={{
                                                        fontSize: 11, fontWeight: 600,
                                                        color: statusColor,
                                                        flexShrink: 0,
                                                    }}>
                                                        · {STATUS_LABELS[visit.status] || visit.status}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Chevron */}
                                            <ChevronRight sx={{
                                                fontSize: 20, color: 'text.disabled', flexShrink: 0,
                                                display: { xs: 'none', sm: 'block' },
                                                alignSelf: 'center',
                                            }} />
                                        </Box>
                                    </React.Fragment>
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            )}

            {/* Now marker */}
            {range === 'today' && todayVisits.length > 0 && (
                <Box sx={{
                    px: { xs: 2, sm: 3 }, py: 0.75,
                    display: 'flex', alignItems: 'center', gap: 1,
                    borderTop: '1px solid', borderColor: 'divider',
                    bgcolor: alpha('#0A84FF', 0.03),
                }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#0A84FF', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#0A84FF', fontVariantNumeric: 'tabular-nums' }}>
                        Teraz {nowTimeStr}
                    </Typography>
                </Box>
            )}

            {/* Footer */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 1 }}>
                <Button
                    variant="text"
                    size="small"
                    onClick={() => navigate('/calendar')}
                    sx={{ textTransform: 'none', fontSize: 13, fontWeight: 500, color: 'text.secondary', px: 0, '&:hover': { color: 'primary.main', bgcolor: 'transparent' } }}
                >
                    Zobacz cały kalendarz →
                </Button>
            </Box>
        </Box>
    );
};
