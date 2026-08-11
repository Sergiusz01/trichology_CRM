import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import plLocale from '@fullcalendar/core/locales/pl';
import listPlugin from '@fullcalendar/list';
import {
  Box, Paper, CircularProgress, useTheme, useMediaQuery,
  Typography, IconButton, Fab, Divider, Skeleton,
  Card, CardActionArea, CardContent, Stack, Tooltip, alpha, Chip,
  Badge, Button, ButtonGroup, ToggleButtonGroup, ToggleButton,
  Select, MenuItem, ButtonBase, darken
} from '@mui/material';
import {
  Add, Refresh, CalendarToday, ArrowForwardIos,
  ChevronLeft, ChevronRight, AccessTime, TodayRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { api } from '../services/api';
import { PageHeader } from '../ui/PageHeader';

// ── Types ─────────────────────────────────────────────────────────────────────
interface VisitEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  extendedProps: {
    patientId: string;
    patientName: string;
    visitType: string;
    status: string;
  };
}

interface WeekStats {
  zaplanowana: number;
  odbyta: number;
  nieobecnosc: number;
  anulowana: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  ZAPLANOWANA: '#3B82F6',
  ODBYTA:      '#10B981',
  ANULOWANA:   '#EF4444',
  NIEOBECNOSC: '#F59E0B',
};

const STATUS_LABEL: Record<string, string> = {
  ZAPLANOWANA: 'Zaplanowana',
  ODBYTA:      'Odbyta',
  ANULOWANA:   'Anulowana',
  NIEOBECNOSC: 'Nieobecność',
};



const DAY_NAMES_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const DAY_NAMES_LONG  = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const MONTH_NAMES = [
  'stycznia','lutego','marca','kwietnia','maja','czerwca',
  'lipca','sierpnia','września','października','listopada','grudnia'
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function formatDayHeader(date: Date): string {
  const today = new Date();
  if (sameDay(date, today)) return 'Dzisiaj';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'Jutro';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Wczoraj';
  return `${DAY_NAMES_LONG[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

// Helper to format date range label based on view
function formatRangeLabel(date: Date, view: string): string {
  switch (view) {
    case 'dayGridMonth':
      return format(date, 'LLLL yyyy', { locale: pl });
    case 'timeGridDay':
    case 'listDay':
      return format(date, 'd MMMM yyyy', { locale: pl });
    case 'timeGridWeek':
    default: {
      const end = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000);
      return `${format(date, 'd', { locale: pl })}–${format(end, 'd MMMM yyyy', { locale: pl })}`;
    }
  }
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, miniMonth, setMiniMonth, onSelect, events }: { selectedDate: Date; miniMonth: Date; setMiniMonth: (d: Date) => void; onSelect: (d: Date) => void; events: VisitEvent[] }) {
  const theme = useTheme();
  
  const year = miniMonth.getFullYear();
  const month = miniMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0, Sun=6
  
  const days: Date[] = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(new Date(year, month, -startingDay + i + 1));
  }
  while (days.length < 42) {
    days.push(new Date(year, month, days.length - startingDay + 1));
  }
  
  const today = new Date();
  
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={500} sx={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
          {format(miniMonth, 'LLLL yyyy', { locale: pl })}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => setMiniMonth(new Date(year, month - 1, 1))} sx={{ width: 24, height: 24 }}>
            <ChevronLeft sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setMiniMonth(new Date(year, month + 1, 1))} sx={{ width: 24, height: 24 }}>
            <ChevronRight sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Stack>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', justifyItems: 'center', gap: '2px', textAlign: 'center' }}>
        {['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'].map(d => (
          <Typography key={d} sx={{ fontSize: '11px', color: 'text.disabled', mb: 0.5 }}>{d}</Typography>
        ))}
        
        {days.map((d, i) => {
          const isSelected = sameDay(d, selectedDate);
          const isToday = sameDay(d, today);
          const isCurrentMonth = d.getMonth() === month;
          const hasVisits = events.some(e => sameDay(new Date(e.start), d));
          
          return (
            <ButtonBase
              key={i}
              onClick={() => onSelect(d)}
              sx={{
                width: 28, height: 28,
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontVariantNumeric: 'tabular-nums',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                bgcolor: isSelected ? 'primary.main' : 'transparent',
                color: isSelected ? '#fff' : (isCurrentMonth ? (isToday ? 'primary.main' : 'text.primary') : 'text.disabled'),
                fontWeight: isSelected || isToday ? 500 : 400,
                lineHeight: 1,
                '&:hover': { bgcolor: isSelected ? 'primary.main' : alpha(theme.palette.primary.main, 0.1) }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>{d.getDate()}</Box>
              {hasVisits && <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: isSelected ? '#fff' : 'text.secondary', mb: '3px' }} />}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Visit Card ─────────────────────────────────────────────────────────────────
function VisitCard({ event, onClick }: { event: VisitEvent; onClick: () => void }) {
  const status = event.extendedProps.status;
  const color  = STATUS_COLOR[status] || '#3B82F6';
  const label  = STATUS_LABEL[status] || status;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.1s, box-shadow 0.1s, background-color 0.1s',
        '&:active': { transform: 'scale(0.99)' },
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <CardActionArea onClick={onClick}>
        <Stack direction="row" sx={{ p: 1.5, minHeight: 72 }}>
          {/* Status color rail */}
          <Box sx={{ width: 3, borderRadius: '4px', bgcolor: color, mr: 1.5, flexShrink: 0 }} />
          
          <Stack direction="column" sx={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: 'text.secondary', mb: 0.25 }}>
              {formatHour(event.start)}–{formatHour(event.end)}
            </Typography>
            <Typography sx={{ fontSize: '13.5px', fontWeight: 700, mb: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {event.extendedProps.patientName}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ overflow: 'hidden' }}>
              <Typography sx={{ fontSize: '11.5px', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {event.extendedProps.visitType}
              </Typography>
              <Typography sx={{ fontSize: '10px', color: 'text.disabled' }}>•</Typography>
              <Typography sx={{ fontSize: '11.5px', color: color, fontWeight: 500 }}>
                {label.toLowerCase()}
              </Typography>
            </Stack>
          </Stack>
          
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <ArrowForwardIos sx={{ fontSize: 12, color: 'text.disabled' }} />
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

function plural(n: number, forms: [string, string, string]) {
  if (n === 1) return forms[0];
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return forms[1];
  return forms[2];
}

// ── Stats Row ──────────────────────────────────────────────────────────────────
function StatsRow({ stats, loading, activeFilter, onFilterChange }: { stats: WeekStats | null; loading: boolean, activeFilter: string | null, onFilterChange: (f: string | null) => void }) {
  const theme = useTheme();
  
  const items = [
    { key: 'zaplanowana', label: (n: number) => plural(n, ['zaplanowana', 'zaplanowane', 'zaplanowanych']), color: theme.palette.info.main },
    { key: 'odbyta',      label: (n: number) => plural(n, ['odbyta', 'odbyte', 'odbytych']), color: theme.palette.success.main },
    { key: 'anulowana',   label: (n: number) => plural(n, ['odwołana', 'odwołane', 'odwołanych']), color: theme.palette.error.main },
    { key: 'nieobecnosc', label: (n: number) => plural(n, ['nieobecność', 'nieobecności', 'nieobecności']), color: theme.palette.warning.main },
  ];

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: { xs: 1, sm: 2 },
      mb: 2, 
      height: 36, 
      borderBottom: '1px solid', 
      borderColor: 'divider',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    }}>
      {items.map(item => {
        const val = stats?.[item.key as keyof WeekStats] ?? 0;
        const isZero = val === 0;
        const isActive = activeFilter === item.key;
        
        return (
          <ButtonBase
            key={item.key}
            onClick={() => onFilterChange(isActive ? null : item.key)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              height: 28,
              px: 1,
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              bgcolor: isActive ? alpha(theme.palette.action.selected, 0.5) : 'transparent',
              transition: 'background-color 0.15s',
              '&:hover': {
                bgcolor: alpha(theme.palette.action.selected, 0.3),
              }
            }}
          >
            {loading ? (
              <Skeleton width={80} />
            ) : (
              <>
                <Box sx={{ 
                  width: 8, height: 8, borderRadius: '50%', 
                  bgcolor: isZero ? 'text.disabled' : item.color 
                }} />
                <Typography sx={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 500, 
                  color: isZero ? 'text.disabled' : 'text.primary' 
                }}>
                  {val}
                </Typography>
                <Typography sx={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 400, 
                  color: isZero ? 'text.disabled' : 'text.secondary' 
                }}>
                  {item.label(val)}
                </Typography>
              </>
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export default function CalendarPage() {
  const [events,       setEvents]       = useState<VisitEvent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [weekStats,    setWeekStats]    = useState<WeekStats | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listDay'>('timeGridWeek');
  const [miniMonth, setMiniMonth] = useState(selectedDate);

  // Keep mini calendar month in sync when selectedDate changes
  useEffect(() => {
    setMiniMonth(selectedDate);
  }, [selectedDate]);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const calendarRef = useRef<FullCalendar>(null);
  const touchStartX = useRef<number | null>(null);

  const fetchEvents = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      const res = await api.get('/visits');
      const apiVisits = res.data.data || res.data;
      setEvents(apiVisits.map((v: any) => {
        const startDate = new Date(v.data);
        const endDate   = new Date(startDate.getTime() + 60 * 60000);
        return {
          id: v.id,
          title: `${v.patient?.firstName || ''} ${v.patient?.lastName || ''} — ${v.rodzajZabiegu || 'Wizyta'}`,
          start: startDate.toISOString(),
          end:   endDate.toISOString(),
          color: STATUS_COLOR[v.status] || '#3B82F6',
          extendedProps: {
            patientId:   v.patientId,
            patientName: `${v.patient?.firstName || ''} ${v.patient?.lastName || ''}`.trim(),
            visitType:   v.rodzajZabiegu || v.visitType || 'Wizyta',
            status:      v.status,
          },
        };
      }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/visits/stats/weekly-revenue');
      setWeekStats(res.data.visitsThisWeek);
    } catch { /* non-critical */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); fetchStats(); }, []);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      const next = new Date(selectedDate);
      next.setDate(selectedDate.getDate() + (dx < 0 ? 1 : -1));
      setSelectedDate(next);
    }
    touchStartX.current = null;
  };

  const goPrev = () => {
      calendarRef.current?.getApi().prev();
      const newDate = calendarRef.current?.getApi().getDate();
      if (newDate) setSelectedDate(newDate);
    };
    const goNext = () => {
      calendarRef.current?.getApi().next();
      const newDate = calendarRef.current?.getApi().getDate();
      if (newDate) setSelectedDate(newDate);
    };
  
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(selectedDate);
    }
  }, [selectedDate]);
  
  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(calendarView);
    }
  }, [calendarView]);

  const filteredEvents = activeFilter ? events.filter(e => e.extendedProps.status === activeFilter) : events;

  const dayEvents = filteredEvents
    .filter(e => sameDay(new Date(e.start), selectedDate))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const refresh = () => { fetchEvents(true); fetchStats(); };

  return (
    <Box sx={{ pb: isMobile ? 10 : 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title={<Typography sx={{ fontSize: { xs: 20, md: 22 }, fontWeight: 500, m: 0, p: 0 }}>Kalendarz</Typography>}
        subtitle={<Typography sx={{ fontSize: 13, fontWeight: 400, color: 'text.secondary' }}>Harmonogram i zarządzanie wizytami</Typography>}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {!isMobile && (
              <Button
                variant="contained"
                size="small"
                disableElevation
                startIcon={<Add />}
                onClick={() => navigate('/visits/new')}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  px: 2,
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                Zaplanuj wizytę
              </Button>
            )}
            <Tooltip title="Odśwież">
              <IconButton onClick={refresh} disabled={refreshing} size="small">
                <Refresh sx={{ fontSize: 20, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />
      
      {/* ── NAWIGACJA (NavBar) ────────────────────────────────────────── */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: 1.5,
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1,
        mb: 2,
        minHeight: 40
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': { px: 1, minWidth: 'auto', borderColor: 'divider', color: 'text.secondary' } }}>
            <Button onClick={goPrev}><ChevronLeft sx={{ fontSize: 18 }} /></Button>
            <Button onClick={goNext}><ChevronRight sx={{ fontSize: 18 }} /></Button>
          </ButtonGroup>
          
          {isMobile ? (
            <IconButton size="small" onClick={() => setSelectedDate(new Date())} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <TodayRounded sx={{ fontSize: 16 }} />
            </IconButton>
          ) : (
            <Button 
              size="small" 
              variant="outlined"
              disabled={sameDay(selectedDate, new Date())}
              onClick={() => setSelectedDate(new Date())}
              sx={{ textTransform: 'none', px: 1.5, borderColor: 'divider', color: 'text.primary', '&.Mui-disabled': { borderColor: 'divider', color: 'text.disabled' } }}
            >
              Dziś
            </Button>
          )}
          
          <Typography sx={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {formatRangeLabel(selectedDate, calendarView)}
          </Typography>
        </Stack>
        
        {isSmallMobile ? (
          <Select
            size="small"
            value={calendarView}
            onChange={(e) => setCalendarView(e.target.value as any)}
            sx={{ width: '100%', fontSize: 13, '& .MuiSelect-select': { py: 0.75 } }}
          >
            <MenuItem value="dayGridMonth">Miesiąc</MenuItem>
            <MenuItem value="timeGridWeek">Tydzień</MenuItem>
            <MenuItem value="timeGridDay">Dzień</MenuItem>
            <MenuItem value="listDay">Plan dnia</MenuItem>
          </Select>
        ) : (
          <ToggleButtonGroup 
            size="small"
            value={calendarView}
            exclusive
            onChange={(_, val) => val && setCalendarView(val)}
            sx={{ 
              height: 26,
              '& .MuiToggleButton-root': { 
                textTransform: 'none', 
                px: 1.2, 
                fontSize: 11.5, 
                whiteSpace: 'nowrap',
                border: '1px solid divider',
                color: 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  color: 'text.primary',
                }
              } 
            }}
          >
            <ToggleButton value="dayGridMonth">Miesiąc</ToggleButton>
            <ToggleButton value="timeGridWeek">Tydzień</ToggleButton>
            <ToggleButton value="timeGridDay">Dzień</ToggleButton>
            <ToggleButton value="listDay">Plan dnia</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* ── STATS ──────────────────────────────────────────────────── */}
      <StatsRow stats={weekStats} loading={statsLoading} activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' }, flex: 1, minHeight: 0 }}>

        {/* ── LEFT: Day Panel ───────────────────────────────────────── */}
        <Box sx={{ width: { xs: '100%', md: 320, lg: 360 }, flexShrink: 0 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider', mb: 2, background: theme.palette.mode === 'dark' ? alpha('#1E293B', 0.8) : '#fff' }}>
            <MiniCalendar selectedDate={selectedDate} miniMonth={miniMonth} setMiniMonth={setMiniMonth} onSelect={setSelectedDate} events={filteredEvents} />
          </Paper>

          {/* Day visits panel */}
          <Paper
            elevation={0}
            sx={{
              p: 2, borderRadius: '12px',
              border: '1px solid', borderColor: 'divider',
              background: theme.palette.mode === 'dark' ? alpha('#1E293B', 0.8) : '#fff',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Day header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                  {formatDayHeader(selectedDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </Typography>
              </Box>
              <Badge
                badgeContent={dayEvents.length}
                color="primary"
                showZero
                sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
              >
                <CalendarToday sx={{ color: 'primary.main', fontSize: 22 }} />
              </Badge>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* Swipe hint — mobile only */}
            {isMobile && dayEvents.length > 0 && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'block', textAlign: 'center', mb: 1.5, fontSize: '0.65rem' }}
              >
                ← przesuń aby zmienić dzień →
              </Typography>
            )}

            {/* Visit list */}
            {loading ? (
              <>
                <Skeleton variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: '12px' }} />
                <Skeleton variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: '12px' }} />
              </>
            ) : dayEvents.length === 0 ? (
              <Box sx={{
                textAlign: 'center', py: 4, px: 2,
                bgcolor: 'action.hover',
                borderRadius: '12px',
                border: `1px dashed ${theme.palette.divider}`,
              }}>
                <CalendarToday sx={{ fontSize: 28, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" fontWeight={500} color="text.secondary">
                  Brak wizyt w tym dniu
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Przesuń palcem lub kliknij strzałkę
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 600 }}>
                  {dayEvents.length} {dayEvents.length === 1 ? 'wizyta' : dayEvents.length < 5 ? 'wizyty' : 'wizyt'}
                </Typography>
                {dayEvents.map(ev => (
                  <VisitCard
                    key={ev.id}
                    event={ev}
                    onClick={() => navigate(`/patients/${ev.extendedProps.patientId}?tab=visits&visitId=${ev.id}`)}
                  />
                ))}
              </>
            )}

            {/* Add visit button */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/visits/new')}
              sx={{
                mt: 2,
                bgcolor: 'primary.main',
                color: 'white',
                textTransform: 'none',
                fontWeight: 700,
                py: 1.5,
                borderRadius: '8px',
                boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: (theme) => `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                },
              }}
            >
              Zaplanuj wizytę
            </Button>
          </Paper>
        </Box>

        {/* ── RIGHT: FullCalendar ───────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1, sm: 2.5 },
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              position: 'relative',
              overflow: 'hidden',
              '--fc-now-color': theme.palette.primary.main,
            }}
          >
            {loading && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: theme.palette.background.default, zIndex: 10 }}>
                <CircularProgress />
              </Box>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={isMobile ? 'listDay' : 'timeGridWeek'}
              headerToolbar={false}
              locales={[plLocale]}
              locale="pl"
              timeZone="UTC"
              events={events}
              nowIndicator={true}
              height="auto"
              contentHeight="auto"
              aspectRatio={isMobile && calendarView !== 'listDay' ? 1 : undefined}
              allDaySlot={false}
              slotMinTime="08:00:00"
              slotMaxTime="22:00:00"
              slotEventOverlap={false}
              slotDuration="00:30:00"
              slotLabelInterval="01:00"
              slotLabelFormat={{ hour: '2-digit', omitZeroMinute: true, meridiem: false }}
              dayHeaderContent={(arg) => {
                const isToday = sameDay(arg.date, new Date());
                const isWeekend = arg.date.getDay() === 0 || arg.date.getDay() === 6;
                return (
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    <Typography sx={{ fontSize: '11px', fontWeight: 400, color: isWeekend ? 'text.disabled' : 'text.secondary', textTransform: 'lowercase' }}>
                      {format(arg.date, 'E', { locale: pl }).slice(0, 2)}
                    </Typography>
                    <Typography sx={{
                      fontSize: '13px',
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'primary.main' : (isWeekend ? 'text.disabled' : 'text.primary'),
                    }}>
                      {arg.date.getDate()}
                    </Typography>
                  </Stack>
                );
              }}
              eventClick={(info) => {
                const { patientId } = info.event.extendedProps;
                if (patientId) navigate(`/patients/${patientId}?tab=visits&visitId=${info.event.id}`);
              }}
              dateClick={(info) => setSelectedDate(info.date)}
              views={{
                timeGridDay:  { titleFormat: { day: 'numeric', month: 'long' } },
                listMonth:    { noEventsText: 'Brak wizyt w tym miesiącu' },
                listWeek:     { noEventsText: 'Brak wizyt w tym tygodniu' },
                listDay:      { noEventsText: 'Brak wizyt w tym dniu' },
              }}
              eventContent={(arg) => {
                const viewType = arg.view.type;
                const patientName = arg.event.extendedProps.patientName;
                const bgColor     = arg.event.backgroundColor || '#3B82F6';

                // Month view — muted pill (same style family as week/day)
                if (viewType === 'dayGridMonth') {
                  return (
                    <Box sx={{
                      px: 0.5, py: 0.1,
                      bgcolor: alpha(bgColor, 0.12),
                      borderLeft: `2px solid ${bgColor}`,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      width: '100%',
                    }}>
                      <Typography sx={{ fontSize: '11px', fontWeight: 600, color: darken(bgColor, 0.3), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {patientName}
                      </Typography>
                    </Box>
                  );
                }

                // Time grid / list view
                const nameParts = patientName.trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ');

                return (
                  <Box sx={{ 
                    px: 0.5, py: 0.25, 
                    overflow: 'hidden', 
                    lineHeight: 1.1,
                    borderLeft: `2px solid ${bgColor}`,
                    bgcolor: alpha(bgColor, 0.1),
                    color: theme.palette.mode === 'dark' ? '#fff' : darken(bgColor, 0.35),
                    height: '100%',
                    width: '100%',
                    borderRadius: 0,
                    transition: 'all 0.12s',
                    '&:hover': {
                      borderLeftWidth: '3px',
                      filter: 'brightness(0.97)'
                    }
                  }}>
                    <Typography sx={{ fontSize: '10.5px', fontWeight: 500, mb: 0 }} noWrap>
                      {firstName}
                    </Typography>
                    {lastName && (
                      <Typography sx={{ fontSize: '11.5px', fontWeight: 700 }} noWrap>
                        {lastName}
                      </Typography>
                    )}
                  </Box>
                );
              }}
            />
          </Paper>
        </Box>
      </Box>

      {/* ── FAB (mobile) ─────────────────────────────────────────────── */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed', bottom: 82, right: 18, zIndex: 1200,
            boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.45)}`,
          }}
          onClick={() => navigate('/visits/new')}
        >
          <Add />
        </Fab>
      )}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .fc .fc-button {
          border-radius: 8px !important;
          font-weight: 500 !important;
          text-transform: none !important;
          border: 1px solid rgba(0,0,0,0.12) !important;
          padding: 6px 12px !important;
          box-shadow: none !important;
          transition: all 0.15s ease !important;
        }
        .fc .fc-button-primary {
          background-color: transparent !important;
          color: #475569 !important;
        }
        .fc .fc-button-primary:hover {
          background-color: #f1f5f9 !important;
          border-color: rgba(0,0,0,0.15) !important;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          border-color: rgba(0,0,0,0.2) !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05) !important;
        }
        .fc .fc-today-button {
          background-color: transparent !important;
          color: #0f172a !important;
          font-weight: 600 !important;
        }
        .fc-theme-standard .fc-scrollgrid { border: none !important; }
        .fc .fc-timegrid-slot { height: 22px !important; } /* 44px per hour */
        .fc .fc-timegrid-slot-label { font-size: 11px; color: #64748b; font-weight: 500; border: none !important; vertical-align: top; padding-top: 4px; padding-right: 8px; }
        .fc .fc-timegrid-axis { border: none !important; }
        .fc .fc-timegrid-col-events { margin: 0 2px !important; }
        .fc .fc-col-header-cell { padding: 8px 0; border-top: none !important; border-bottom: 1px solid rgba(0,0,0,0.06) !important; border-left: 1px solid rgba(0,0,0,0.06) !important; border-right: none !important; }
        .fc .fc-col-header-cell:first-of-type { border-left: none !important; }
        .fc .fc-col-header-cell-cushion { padding: 4px 8px !important; }
        
        .fc-day-sat, .fc-day-sun { background-color: #f8fafc !important; }
        .fc .fc-day-today { background-color: rgba(59, 130, 246, 0.04) !important; }
        .fc .fc-timegrid-now-indicator-line { border-color: var(--fc-now-color, #3B82F6) !important; border-width: 1.5px !important; }
        .fc .fc-timegrid-now-indicator-arrow { display: none; }
        .fc .fc-timegrid-now-indicator-line::before { content: ""; position: absolute; width: 6px; height: 6px; background: var(--fc-now-color, #3B82F6); border-radius: 50%; left: -3px; top: -2.5px; }
        
        .fc .fc-event { border: none !important; background: transparent !important; }
        .fc .fc-timegrid-event-harness { padding: 0 2px; }
        .fc .fc-v-event { background: transparent !important; border: none !important; box-shadow: none !important; }
        .fc .fc-theme-standard td, .fc .fc-theme-standard th { border-color: rgba(0,0,0,0.04) !important; }
        .fc .fc-timegrid-slot-minor { border-top-style: dashed !important; border-color: rgba(0,0,0,0.03) !important; }
        
        .fc .fc-list-event:hover td { background:rgba(0,122,255,0.04) !important; }
        .fc .fc-list-day-cushion { background-color: #f8fafc !important; padding: 8px 14px !important; font-weight: 600 !important; }
        .fc .fc-list-event-time { font-weight: 600 !important; color: #475569 !important; }
        .fc .fc-list-event-title { font-weight: 500 !important; color: #0f172a !important; }
      `}</style>
    </Box>
  );
}
