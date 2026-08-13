import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  alpha,
  useTheme,
  useMediaQuery,
  Avatar,
  Paper,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add,
  EventNote,
  ChevronRight,
  Person,
  Search,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ErrorState } from '../ui/ErrorState';
import { useConsultations } from '../hooks/queries/useConsultations';
import { PageHeader } from '../ui/PageHeader';

const getDeterministicColor = (id: string) => {
  if (!id) return { bg: '#e0f2fe', color: '#0284c7' };
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorSchemes = [
    { bg: '#e0f2fe', color: '#0284c7' }, // blue
    { bg: '#dcfce7', color: '#16a34a' }, // green
    { bg: '#f3e8ff', color: '#9333ea' }, // purple
    { bg: '#ffedd5', color: '#ea580c' }, // orange
    { bg: '#fce7f3', color: '#db2777' }, // pink
  ];
  return colorSchemes[Math.abs(hash) % colorSchemes.length];
};

export default function ConsultationsPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading: loading, error: queryError, refetch } = useConsultations({
    page,
    limit: rowsPerPage,
    search: debouncedSearch,
    archived: showArchived ? 'all' : 'false',
  });

  const consultations = data?.consultations ?? [];
  const total = data?.pagination?.total ?? 0;
  const error = queryError
    ? (queryError as any)?.response?.data?.error ?? 'Nie udało się załadować konsultacji. Spróbuj ponownie.'
    : null;

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), 'dd MMM yyyy', { locale: pl }) : '—';

  // Data is already paginated by the server — no local slice needed

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <PageHeader
        title="Konsultacje"
        subtitle="Lista wszystkich konsultacji. Kliknij, aby zobaczyć szczegóły."
      />

      {/* Search & Filter Switch */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3, alignItems: { xs: 'flex-start', sm: 'center' } }}>
        <TextField
          size="small"
          placeholder="Szukaj po nazwisku lub imieniu pacjenta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            maxWidth: 420,
            width: '100%',
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setPage(0);
              }}
              color="primary"
            />
          }
          label={
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>
              Pokaż zarchiwizowane
            </Typography>
          }
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <ErrorState message={error} onRetry={() => refetch()} />
      ) : consultations.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <EventNote sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
            Brak konsultacji
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Konsultacje dodajesz z karty pacjenta.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Person />}
            onClick={() => navigate('/patients')}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Przejdź do pacjentów
          </Button>
        </Paper>
      ) : isMobile ? (
        <Grid container spacing={2}>
          {consultations.map((c) => (
            <Grid key={c.id} size={{ xs: 12 }}>
              <Card
                elevation={0}
                onClick={() => navigate(`/consultations/${c.id}`)}
                sx={{
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  },
                }}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {(() => {
                      const avatarColor = getDeterministicColor(c.patientId || c.patient?.id || c.id);
                      return (
                        <Avatar sx={{ bgcolor: avatarColor.bg, color: avatarColor.color, fontWeight: 600 }}>
                          {c.patient.firstName[0]}
                          {c.patient.lastName[0]}
                        </Avatar>
                      );
                    })()}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {c.patient.firstName} {c.patient.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatDate(c.consultationDate)}
                        {c.doctor?.name ? ` • ${c.doctor.name}` : ''}
                      </Typography>
                    </Box>
                    {c.isArchived && (
                      <Chip label="Zarchiwizowana" size="small" variant="outlined" color="warning" sx={{ borderRadius: '6px' }} />
                    )}
                    <ChevronRight sx={{ color: 'text.secondary' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03), borderBottom: '1px solid', borderColor: 'divider' }}>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Pacjent</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Data konsultacji</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Lekarz</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {consultations.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => navigate(`/consultations/${c.id}`)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease-in-out',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {(() => {
                        const avatarColor = getDeterministicColor(c.patientId || c.patient?.id || c.id);
                        return (
                          <Avatar sx={{ width: 36, height: 36, bgcolor: avatarColor.bg, color: avatarColor.color, fontSize: '0.875rem', fontWeight: 600 }}>
                            {c.patient.firstName[0]}
                            {c.patient.lastName[0]}
                          </Avatar>
                        );
                      })()}
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {c.patient.firstName} {c.patient.lastName}
                        </Typography>
                        {c.patient.email && (
                          <Typography variant="caption" color="text.secondary">
                            {c.patient.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatDate(c.consultationDate)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2">{c.doctor?.name ?? '—'}</Typography>
                      {c.isArchived && <Chip label="Zarchiwizowana" size="small" variant="outlined" color="warning" sx={{ borderRadius: '6px' }} />}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <ChevronRight sx={{ color: 'text.secondary' }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Wierszy na stronę:"
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          />
        </TableContainer>
      )
      }
    </Box >
  );
}
