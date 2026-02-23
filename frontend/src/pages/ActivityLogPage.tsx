import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import {
  PersonAdd,
  Edit,
  EventNote,
  CalendarToday,
  Science,
  PhotoCamera,
  Assignment,
  Email,
  ArrowForward,
  Refresh,
  Login as LoginIcon,
  Info,
} from '@mui/icons-material';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  link: string;
  userName: string;
  userEmail: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
}

function getActivityIcon(type: string) {
  if (type === 'LOGIN') return <LoginIcon />;
  switch (type) {
    case 'PATIENT':
    case 'CREATE_PATIENT':
    case 'RESTORE_PATIENT':
      return <PersonAdd />;
    case 'UPDATE_PATIENT':
    case 'ARCHIVE_PATIENT':
    case 'DELETE_PATIENT':
    case 'PATIENT_EDIT':
      return <Edit />;
    case 'CONSULTATION':
    case 'CREATE_CONSULTATION':
    case 'RESTORE_CONSULTATION':
    case 'CONSULTATION_EDIT':
      return <EventNote />;
    case 'UPDATE_CONSULTATION':
    case 'ARCHIVE_CONSULTATION':
    case 'DELETE_CONSULTATION':
      return <Edit />;
    case 'VISIT':
    case 'CREATE_VISIT':
    case 'UPDATE_VISIT':
    case 'UPDATE_VISIT_STATUS':
    case 'DELETE_VISIT':
    case 'VISIT_EDIT':
      return <CalendarToday />;
    case 'LAB_RESULT':
    case 'CREATE_LAB_RESULT':
    case 'RESTORE_LAB_RESULT':
    case 'LAB_RESULT_EDIT':
      return <Science />;
    case 'UPDATE_LAB_RESULT':
    case 'ARCHIVE_LAB_RESULT':
    case 'DELETE_LAB_RESULT':
      return <Edit />;
    case 'SCALP_PHOTO':
      return <PhotoCamera />;
    case 'CARE_PLAN':
    case 'CREATE_CARE_PLAN':
    case 'RESTORE_CARE_PLAN':
    case 'CARE_PLAN_EDIT':
      return <Assignment />;
    case 'UPDATE_CARE_PLAN':
    case 'ARCHIVE_CARE_PLAN':
    case 'DELETE_CARE_PLAN':
      return <Edit />;
    case 'EMAIL':
      return <Email />;
    default:
      return <EventNote />;
  }
}

function getActivityColor(type: string): string {
  if (type === 'LOGIN') return '#2e7d32';
  if (
    type.startsWith('PATIENT') ||
    type === 'CREATE_PATIENT' ||
    type === 'RESTORE_PATIENT'
  )
    return '#1976d2';
  if (
    type.startsWith('CONSULTATION') ||
    type === 'CREATE_CONSULTATION' ||
    type === 'RESTORE_CONSULTATION'
  )
    return '#d32f2f';
  if (
    type.startsWith('VISIT') ||
    type === 'CREATE_VISIT' ||
    type === 'UPDATE_VISIT' ||
    type === 'UPDATE_VISIT_STATUS' ||
    type === 'DELETE_VISIT'
  )
    return '#34C759';
  if (
    type.startsWith('LAB_RESULT') ||
    type === 'CREATE_LAB_RESULT' ||
    type === 'RESTORE_LAB_RESULT'
  )
    return '#FF9500';
  if (type === 'SCALP_PHOTO') return '#AF52DE';
  if (
    type.startsWith('CARE_PLAN') ||
    type === 'CREATE_CARE_PLAN' ||
    type === 'RESTORE_CARE_PLAN'
  )
    return '#007AFF';
  return '#1976d2';
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ activities?: ActivityItem[] }>('/activity', {
        params: { limit: 2000 },
      });
      setActivities(res.data.activities ?? []);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          'Nie udało się załadować dziennika aktywności.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const paginated = activities.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2, md: 3 },
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Dziennik aktywności
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Wszystkie zdarzenia w systemie: logowania, kto się zalogował, dodane i zmienione
              rekordy (pacjenci, wizyty, konsultacje, wyniki badań, plany opieki).
            </Typography>
          </Box>
          <Button
            startIcon={<Refresh />}
            onClick={fetchActivities}
            variant="outlined"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Odśwież
          </Button>
        </Box>
      </Box>

      <Alert
        severity="info"
        icon={<Info />}
        sx={{ mb: 2 }}
      >
        <strong>Co jest rejestrowane:</strong> logowania użytkowników (kto, kiedy), dodawanie i
        edycja pacjentów, wizyt, konsultacji, wyników badań i planów opieki, archiwizowanie oraz
        przywracanie. Użyj tego widoku do weryfikacji aktywności w systemie.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : activities.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Brak zapisanych aktywności. Zaloguj się i wykonaj akcje – pojawią się tutaj.
          </Typography>
        ) : isMobile ? (
          <>
            <List sx={{ p: 0 }}>
              {paginated.map((a, idx) => (
                <React.Fragment key={a.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{
                      py: 2,
                      alignItems: 'flex-start',
                      '&:hover': { bgcolor: alpha('#1976d2', 0.04) },
                    }}
                    secondaryAction={
                      a.link ? (
                        <IconButton
                          edge="end"
                          onClick={() => navigate(a.link)}
                          sx={{
                            bgcolor: alpha('#1976d2', 0.1),
                            '&:hover': { bgcolor: alpha('#1976d2', 0.2) },
                          }}
                        >
                          <ArrowForward sx={{ color: '#1976d2' }} />
                        </IconButton>
                      ) : null
                    }
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor: getActivityColor(a.type),
                          color: 'white',
                        }}
                      >
                        {getActivityIcon(a.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight={600}>
                          {a.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.primary">
                            {a.userName} ({a.userEmail})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(a.date), 'dd MMM yyyy, HH:mm:ss', { locale: pl })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
            <TablePagination
              component="div"
              count={activities.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="Na stronę:"
            />
          </>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Data i godzina
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Kto
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Akcja (co zostało dodane / zmienione)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Jednostka
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>
                      Odnośnik
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((a) => (
                    <TableRow
                      key={a.id}
                      hover
                      sx={{
                        '&:hover': { bgcolor: alpha('#1976d2', 0.04) },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(a.date), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: getActivityColor(a.type),
                              color: 'white',
                              fontSize: '0.875rem',
                            }}
                          >
                            {getActivityIcon(a.type)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {a.userName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {a.userEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {a.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {a.entity}
                          {a.entityId ? ` #${a.entityId.slice(-6)}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {a.link ? (
                          <IconButton
                            size="small"
                            onClick={() => navigate(a.link)}
                            sx={{
                              bgcolor: alpha('#1976d2', 0.1),
                              '&:hover': { bgcolor: alpha('#1976d2', 0.2) },
                            }}
                          >
                            <ArrowForward sx={{ color: '#1976d2', fontSize: 18 }} />
                          </IconButton>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={activities.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[50, 100, 200, 500, 1000]}
              labelRowsPerPage="Wierszy na stronę:"
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
