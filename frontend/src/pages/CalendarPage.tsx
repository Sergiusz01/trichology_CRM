import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import plLocale from '@fullcalendar/core/locales/pl';
import listPlugin from '@fullcalendar/list';
import {
  Box, Paper, CircularProgress, useTheme, useMediaQuery,
  Typography, IconButton, Fab, Divider, Skeleton,
  Card, CardActionArea, CardContent, Stack, Tooltip, alpha,
} from '@mui/material';
import {
  Add, Refresh, CalendarToday, ArrowForwardIos,

} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageHeader } from '../ui/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────
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
    czas?: string;
  };
}

interface WeekStats {
  zaplanowana: number;
  odbyta: number;
  nieobecnosc: number;
  anulowana: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  ZAPLANOWANA: '#2196f3',
  ODBYTA:      '#4caf50',
  ANULOWANA:   '#f44336',
  NIEOBECNOSC: '#ff9800',
};

const STATUS_LABEL: Record<string, string> = {
  ZAPLANOWANA: 'Zaplanowana',
  ODBYTA:      'Odbyta',
  ANULOWANA:   'Anulowana',
  NIEOBECNOSC: 'Nieobecność',
};


function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function todayLabel(): string {
  return new Date().toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── Today Visit Card ─────────────────────────────────────────────────────────
function TodayVisitCard({ event, onClick }: { event: VisitEvent; onClick: () => void }) {
  const status = event.extendedProps.status;
  const color = STATUS_COLOR[status] || '#2196f3';
  const label = STATUS_LABEL[status] || status;

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: alpha(color, 0.3),
        borderLeft: `4px solid ${color}`,
        borderRadius: 2,
        mb: 1.5,
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
          {/* Row 1: godzina + imię + strzałka */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {/* Godzina */}
            <Typography
              fontWeight={800}
              color={color}
              sx={{ fontSize: '1rem', minWidth: 42, flexShrink: 0 }}
            >
              {formatHour(event.start)}
            </Typography>

            {/* Imię + zabieg */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {event.extendedProps.patientName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
              >
                {event.extendedProps.visitType || 'Wizyta'}
              </Typography>
            </Box>

            {/* Status dot + strzałka */}
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Box
                title={label}
                sx={{
                  width: 10, height: 10, borderRadius: '50%',
                  bgcolor: color, flexShrink: 0,
                }}
              />
              <ArrowForwardIos sx={{ fontSize: 11, color: 'text.disabled' }} />
            </Stack>
          </Stack>

          {/* Row 2: status label pełny jako podpis — czytelny, nie obcięty */}
          <Typography
            variant="caption"
            sx={{ color, fontWeight: 600, fontSize: '0.68rem', mt: 0.25, display: 'block' }}
          >
            {label}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ── Week Stats Bar ────────────────────────────────────────────────────────────
function WeekStatsBar({ stats, loading }: { stats: WeekStats | null; loading: boolean }) {
  const items = [
    { key: 'zaplanowana', label: 'Zaplanowane', color: '#2196f3', icon: '🗓' },
    { key: 'odbyta',      label: 'Odbyte',       color: '#4caf50', icon: '✅' },
    { key: 'anulowana',   label: 'Anulowane',    color: '#f44336', icon: '❌' },
    { key: 'nieobecnosc', label: 'Nieobecność',  color: '#ff9800', icon: '⚠️' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1,
      }}
    >
      {items.map(item => (
        <Box
          key={item.key}
          sx={{
            bgcolor: alpha(item.color, 0.08),
            border: `1px solid ${alpha(item.color, 0.2)}`,
            borderRadius: 2, px: 1.25, py: 0.75,
            display: 'flex', alignItems: 'center', gap: 0.75,
          }}
        >
          <Typography sx={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</Typography>
          {loading ? (
            <Skeleton width={20} height={16} />
          ) : (
            <Typography variant="caption" fontWeight={700} color={item.color}>
              {stats?.[item.key as keyof WeekStats] ?? 0}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [events, setEvents] = useState<VisitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchEvents = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const res = await api.get('/visits');
      const apiVisits = res.data.data || res.data;

      const mappedEvents: VisitEvent[] = apiVisits.map((v: any) => {
        const startDate = new Date(v.data);
        const durationMin = v.czas ? parseInt(v.czas) : 60;
        const endDate = new Date(startDate.getTime() + durationMin * 60000);

        return {
          id: v.id,
          title: `${v.patient?.firstName || ''} ${v.patient?.lastName || ''} — ${v.rodzajZabiegu || 'Wizyta'}`,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          color: STATUS_COLOR[v.status] || '#2196f3',
          extendedProps: {
            patientId: v.patientId,
            patientName: `${v.patient?.firstName || ''} ${v.patient?.lastName || ''}`.trim(),
            visitType: v.rodzajZabiegu || v.visitType || 'Wizyta',
            status: v.status,
            czas: v.czas,
          },
        };
      });
      setEvents(mappedEvents);
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/visits/stats/weekly-revenue');
      setWeekStats(res.data.visitsThisWeek);
    } catch {
      // stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, []);

  const handleEventClick = (info: any) => {
    const { patientId } = info.event.extendedProps;
    if (patientId) {
      navigate(`/patients/${patientId}?tab=visits&visitId=${info.event.id}`);
    }
  };

  // Today's visits sorted by time
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayEvents = events
    .filter(e => {
      const d = new Date(e.start);
      return d >= todayStart && d <= todayEnd;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <Box sx={{ pb: isMobile ? 10 : 0 }}>
      <PageHeader
        title="Kalendarz wizyt"
        subtitle="Zarządzaj harmonogramem wizyt pacjentów"
        action={
          !isMobile && (
            <Tooltip title="Odśwież">
              <IconButton onClick={() => { fetchEvents(true); fetchStats(); }} disabled={refreshing}>
                <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
          )
        }
      />

      {/* ── MOBILE: Today Panel ─────────────────────────────────────────── */}
      {isMobile && (
        <Box sx={{ mb: 2 }}>
          {/* Week stats */}
          <WeekStatsBar stats={weekStats} loading={statsLoading} />

          <Divider sx={{ my: 1.5 }} />

          {/* Today header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CalendarToday sx={{ color: 'primary.main', fontSize: 20 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2, textTransform: 'capitalize' }}>
                  Dzisiaj
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {todayLabel()}
                </Typography>
              </Box>
            </Stack>
            <Tooltip title="Odśwież wizyty">
              <IconButton size="small" onClick={() => { fetchEvents(true); fetchStats(); }} disabled={refreshing}>
                <Refresh fontSize="small" sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Today visits */}
          {loading ? (
            <>
              <Skeleton variant="rounded" height={64} sx={{ mb: 1, borderRadius: 2 }} />
              <Skeleton variant="rounded" height={64} sx={{ mb: 1, borderRadius: 2 }} />
              <Skeleton variant="rounded" height={64} sx={{ borderRadius: 2 }} />
            </>
          ) : todayEvents.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center', py: 3, px: 2,
                bgcolor: alpha(theme.palette.success.main, 0.06),
                borderRadius: 2,
                border: `1px dashed ${alpha(theme.palette.success.main, 0.3)}`,
              }}
            >
              <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>🎉</Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">
                Brak wizyt na dziś
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Wolny dzień lub brak zaplanowanych wizyt
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {todayEvents.length} {todayEvents.length === 1 ? 'wizyta' : todayEvents.length < 5 ? 'wizyty' : 'wizyt'} zaplanowane
              </Typography>
              {todayEvents.map(event => (
                <TodayVisitCard
                  key={event.id}
                  event={event}
                  onClick={() => navigate(`/patients/${event.extendedProps.patientId}?tab=visits&visitId=${event.id}`)}
                />
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Calendar label */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Kalendarz
          </Typography>
        </Box>
      )}

      {/* ── DESKTOP: Week stats ──────────────────────────────────────────── */}
      {!isMobile && (
        <Box sx={{ mb: 2 }}>
          <WeekStatsBar stats={weekStats} loading={statsLoading} />
        </Box>
      )}

      {/* ── FullCalendar ─────────────────────────────────────────────────── */}
      <Paper
        sx={{
          p: { xs: 1, sm: 2, md: 3 },
          borderRadius: 2,
          minHeight: { xs: isMobile ? '60vh' : '80vh', sm: '75vh' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
            <CircularProgress />
          </Box>
        )}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
          headerToolbar={isMobile ? {
            left: 'prev,next',
            center: 'title',
            right: 'timeGridDay,listMonth',
          } : {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          locales={[plLocale]}
          locale="pl"
          events={events}
          eventClick={handleEventClick}
          height={isMobile ? '60vh' : 'auto'}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          nowIndicator={true}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
          }}
          views={{
            timeGridDay: {
              titleFormat: { day: 'numeric', month: 'long', year: 'numeric' },
            },
            listMonth: {
              noEventsText: 'Brak wizyt w tym miesiącu',
            },
            listWeek: {
              noEventsText: 'Brak wizyt w tym tygodniu',
            },
          }}
          eventContent={(arg) => (
            <Box sx={{ px: 0.5, overflow: 'hidden', lineHeight: 1.3 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }} noWrap>
                {arg.timeText}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#fff', opacity: 0.95 }} noWrap>
                {arg.event.extendedProps.patientName}
              </Typography>
              {!isMobile && (
                <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)' }} noWrap>
                  {arg.event.extendedProps.visitType}
                </Typography>
              )}
            </Box>
          )}
        />
      </Paper>

      {/* ── FAB — add visit (mobile) ─────────────────────────────────────── */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            zIndex: 1200,
            boxShadow: '0 4px 20px rgba(33,150,243,0.4)',
          }}
          onClick={() => navigate('/visits/new')}
        >
          <Add />
        </Fab>
      )}

      {/* spin keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Box>
  );
}
