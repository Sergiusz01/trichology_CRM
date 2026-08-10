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
  Badge,
} from '@mui/material';
import {
  Add, Refresh, CalendarToday, ArrowForwardIos,
  ChevronLeft, ChevronRight, AccessTime, TodayRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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

const STATUS_BG: Record<string, string> = {
  ZAPLANOWANA: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  ODBYTA:      'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  ANULOWANA:   'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  NIEOBECNOSC: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
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

// ── Week Strip ─────────────────────────────────────────────────────────────────
function WeekStrip({
  selectedDate, onSelect, events
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  events: VisitEvent[];
}) {
  const theme = useTheme();
  const today = new Date();
  const stripRef = useRef<HTMLDivElement>(null);

  // Build 120-day window: 7 days back + 113 days forward
  const days: Date[] = [];
  for (let i = -7; i <= 113; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }

  // Count visits per day
  const visitCount = (d: Date) =>
    events.filter(e => sameDay(new Date(e.start), d)).length;

  // Scroll selected day into view
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-selected="true"]') as HTMLElement;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedDate]);

  return (
    <Box
      ref={stripRef}
      sx={{
        display: 'flex',
        gap: 0.75,
        overflowX: 'auto',
        pb: 1,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollSnapType: 'x mandatory',
      }}
    >
      {days.map((d, i) => {
        const isToday    = sameDay(d, today);
        const isSelected = sameDay(d, selectedDate);
        const count      = visitCount(d);
        const color      = isSelected ? theme.palette.primary.main : 'transparent';

        return (
          <Box
            key={i}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => onSelect(d)}
            sx={{
              flex: '0 0 auto',
              scrollSnapAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              px: 1.25,
              py: 1,
              borderRadius: 2.5,
              cursor: 'pointer',
              minWidth: 48,
              bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
              border: isSelected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
              transition: 'all 0.18s ease',
              '&:active': { transform: 'scale(0.94)' },
            }}
          >
            <Typography
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: isSelected ? 'primary.main' : 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {DAY_NAMES_SHORT[d.getDay()]}
            </Typography>

            <Box
              sx={{
                width: 34, height: 34,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isToday
                  ? (isSelected ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.15))
                  : 'transparent',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: isToday || isSelected ? 800 : 500,
                  color: isToday && isSelected ? '#fff'
                    : isToday ? 'primary.main'
                    : isSelected ? 'primary.main'
                    : 'text.primary',
                }}
              >
                {d.getDate()}
              </Typography>
            </Box>

            {/* Visit dots */}
            <Box sx={{ height: 8, display: 'flex', gap: 0.35, alignItems: 'center' }}>
              {count > 0 && Array.from({ length: Math.min(count, 3) }).map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 5, height: 5, borderRadius: '50%',
                    bgcolor: isSelected ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.5),
                  }}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Visit Card ─────────────────────────────────────────────────────────────────
function VisitCard({ event, onClick }: { event: VisitEvent; onClick: () => void }) {
  const status = event.extendedProps.status;
  const color  = STATUS_COLOR[status] || '#3B82F6';
  const bg     = STATUS_BG[status] || STATUS_BG.ZAPLANOWANA;
  const label  = STATUS_LABEL[status] || status;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        mb: 1.5,
        border: '1px solid',
        borderColor: alpha(color, 0.2),
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:active': { transform: 'scale(0.985)' },
        '&:hover': {
          boxShadow: `0 8px 24px ${alpha(color, 0.18)}`,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Stack direction="row">
            {/* Colored left bar with time */}
            <Box
              sx={{
                background: bg,
                minWidth: 72, px: 1.5, py: 2,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 0.5,
              }}
            >
              <AccessTime sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }} />
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1 }}>
                {formatHour(event.start)}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem' }}>
                {formatHour(event.end)}
              </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, px: 2, py: 1.75, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.25 }}
              >
                {event.extendedProps.patientName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 1 }}
              >
                {event.extendedProps.visitType || 'Wizyta'}
              </Typography>
              <Chip
                label={label}
                size="small"
                sx={{
                  bgcolor: alpha(color, 0.1),
                  color,
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  height: 20,
                  border: `1px solid ${alpha(color, 0.25)}`,
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', pr: 1.5 }}>
              <ArrowForwardIos sx={{ fontSize: 13, color: 'text.disabled' }} />
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ── Stats Row ──────────────────────────────────────────────────────────────────
function StatsRow({ stats, loading }: { stats: WeekStats | null; loading: boolean }) {
  const items = [
    { key: 'zaplanowana', label: 'Plan.',  color: '#3B82F6', emoji: '📅' },
    { key: 'odbyta',      label: 'Odbyto', color: '#10B981', emoji: '✅' },
    { key: 'anulowana',   label: 'Anulow.',color: '#EF4444', emoji: '❌' },
    { key: 'nieobecnosc', label: 'Nieob.', color: '#F59E0B', emoji: '⚠️' },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, mb: 2 }}>
      {items.map(item => (
        <Box
          key={item.key}
          sx={{
            bgcolor: alpha(item.color, 0.07),
            border: `1px solid ${alpha(item.color, 0.18)}`,
            borderRadius: 2.5,
            py: 1, px: 0.75,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '1rem', lineHeight: 1.2 }}>{item.emoji}</Typography>
          {loading
            ? <Skeleton width="60%" sx={{ mx: 'auto', mt: 0.5 }} />
            : <Typography sx={{ fontWeight: 800, color: item.color, fontSize: '1.1rem', lineHeight: 1 }}>
                {stats?.[item.key as keyof WeekStats] ?? 0}
              </Typography>
          }
          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [events,       setEvents]       = useState<VisitEvent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [weekStats,    setWeekStats]    = useState<WeekStats | null>(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Touch swipe state
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

  // Swipe to change day
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
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

  const goDay = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + offset);
    setSelectedDate(next);
  };

  // Filter visits for selected day
  const dayEvents = events
    .filter(e => sameDay(new Date(e.start), selectedDate))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const refresh = () => { fetchEvents(true); fetchStats(); };

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
      <PageHeader
        title="Kalendarz wizyt"
        subtitle="Harmonogram i zarządzanie wizytami"
        action={
          <Tooltip title="Odśwież">
            <IconButton onClick={refresh} disabled={refreshing} size="small">
              <Refresh sx={{
                fontSize: 20,
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }} />
            </IconButton>
          </Tooltip>
        }
      />

      {/* ── STATS ──────────────────────────────────────────────────── */}
      <StatsRow stats={weekStats} loading={statsLoading} />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', lg: 'row' } }}>

        {/* ── LEFT: Day Panel ───────────────────────────────────────── */}
        <Box
          sx={{
            width: { xs: '100%', lg: 360 },
            flexShrink: 0,
          }}
        >
          {/* Week strip */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              mb: 2,
              background: theme.palette.mode === 'dark'
                ? alpha('#1E293B', 0.8)
                : '#fff',
            }}
          >
            {/* Month label */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
                {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  size="small"
                  onClick={() => goDay(-1)}
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06), width: 28, height: 28 }}
                >
                  <ChevronLeft sx={{ fontSize: 18 }} />
                </IconButton>
                <Tooltip title="Dzisiaj">
                  <IconButton
                    size="small"
                    onClick={() => setSelectedDate(new Date())}
                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06), width: 28, height: 28 }}
                  >
                    <TodayRounded sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <IconButton
                  size="small"
                  onClick={() => goDay(1)}
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06), width: 28, height: 28 }}
                >
                  <ChevronRight sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </Stack>

            <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} events={events} />
          </Paper>

          {/* Day visits panel */}
          <Paper
            elevation={0}
            sx={{
              p: 2, borderRadius: 3,
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
                <Skeleton variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: 3 }} />
                <Skeleton variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: 3 }} />
              </>
            ) : dayEvents.length === 0 ? (
              <Box sx={{
                textAlign: 'center', py: 4, px: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                borderRadius: 3,
                border: `1px dashed ${alpha(theme.palette.success.main, 0.25)}`,
              }}>
                <Typography sx={{ fontSize: '2.2rem', mb: 0.75 }}>🗓️</Typography>
                <Typography variant="body2" fontWeight={600} color="text.secondary">
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
                bgcolor: '#007AFF',
                color: 'white',
                textTransform: 'none',
                fontWeight: 700,
                py: 1.5,
                borderRadius: 2.5,
                boxShadow: `0 4px 14px ${alpha('#007AFF', 0.4)}`,
                '&:hover': {
                  bgcolor: '#0051D5',
                  boxShadow: `0 6px 20px ${alpha('#007AFF', 0.5)}`,
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
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {loading && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                <CircularProgress />
              </Box>
            )}
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
              headerToolbar={{
                left:   'prev,next today',
                center: 'title',
                right:  isMobile
                  ? 'timeGridDay,listMonth'
                  : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }}
              locales={[plLocale]}
              locale="pl"
              timeZone="UTC"
              events={events}
              nowIndicator={true}
              height={isMobile ? 'auto' : 'auto'}
              aspectRatio={isMobile ? '1 / 1.1' : undefined}
              contentHeight={isMobile ? undefined : '75vh'}
              allDaySlot={false}
              slotMinTime="07:00:00"
              slotMaxTime="21:00:00"
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
              eventClick={(info) => {
                const { patientId } = info.event.extendedProps;
                if (patientId) navigate(`/patients/${patientId}?tab=visits&visitId=${info.event.id}`);
                // Also sync day panel
                setSelectedDate(info.event.start!);
              }}
              dateClick={(info) => setSelectedDate(info.date)}
              views={{
                timeGridDay:  { titleFormat: { day: 'numeric', month: 'long' } },
                listMonth:    { noEventsText: 'Brak wizyt w tym miesiącu' },
                listWeek:     { noEventsText: 'Brak wizyt w tym tygodniu' },
              }}
              eventContent={(arg) => {
                const viewType = arg.view.type;
                const patientName = arg.event.extendedProps.patientName;
                const visitType   = arg.event.extendedProps.visitType;
                const bgColor     = arg.event.backgroundColor || '#3B82F6';

                // Month view — compact pill
                if (viewType === 'dayGridMonth') {
                  return (
                    <Box sx={{
                      px: 0.75, py: 0.1,
                      bgcolor: bgColor,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      width: '100%',
                    }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {arg.timeText && <span style={{ opacity: 0.85, marginRight: 3 }}>{arg.timeText}</span>}
                        {patientName}
                      </Typography>
                    </Box>
                  );
                }

                // Time grid / list view — full card
                return (
                  <Box sx={{ px: 0.75, py: 0.25, overflow: 'hidden', lineHeight: 1.35 }}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: '#fff' }} noWrap>
                      {arg.timeText}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.95)', fontWeight: 600 }} noWrap>
                      {patientName}
                    </Typography>
                    {!isMobile && (
                      <Typography sx={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.78)' }} noWrap>
                        {visitType}
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
            boxShadow: '0 6px 24px rgba(59,130,246,0.45)',
          }}
          onClick={() => navigate('/visits/new')}
        >
          <Add />
        </Fab>
      )}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .fc .fc-button {
          border-radius: 10px !important;
          font-weight: 600 !important;
          text-transform: none !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          padding: 8px 14px !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04) !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .fc .fc-button-primary {
          background-color: #ffffff !important;
          color: #1d1d1f !important;
        }
        .fc .fc-button-primary:hover {
          background-color: #f5f5f7 !important;
          border-color: rgba(0,0,0,0.15) !important;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background-color: #007AFF !important;
          color: #ffffff !important;
          border-color: #007AFF !important;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3) !important;
        }
        .fc .fc-today-button {
          background-color: #f5f5f7 !important;
          color: #1d1d1f !important;
          font-weight: 700 !important;
        }
        .fc .fc-event { border-radius:6px !important; border:none !important; }
        .fc .fc-timegrid-event { border-radius:6px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .fc .fc-col-header-cell-cushion { font-weight:700; color: #1d1d1f; }
        .fc .fc-daygrid-day-number { font-weight:600; color: #1d1d1f; }
        .fc .fc-list-event:hover td { background:rgba(0,122,255,0.06) !important; }
        .fc .fc-theme-standard td, .fc .fc-theme-standard th, .fc .fc-theme-standard .fc-scrollgrid {
          border-color: rgba(0,0,0,0.06) !important;
        }
      `}</style>
    </Box>
  );
}
