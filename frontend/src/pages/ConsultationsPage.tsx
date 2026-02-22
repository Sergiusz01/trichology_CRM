import { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
  Add,
  EventNote,
  ChevronRight,
  Person,
  Search,
} from '@mui/icons-material';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Consultation {
  id: string;
  consultationDate: string | null;
  isArchived: boolean;
  patient: { id: string; firstName: string; lastName: string; email?: string };
  doctor?: { id: string; name: string; email: string };
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);              // MUI is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchConsultations = useCallback(async (pg = page, rpp = rowsPerPage, q = search) => {
    try {
      setLoading(true);
      const res = await api.get('/consultations', {
        params: { page: pg + 1, limit: rpp, search: q || undefined },
      });
      setConsultations(res.data.consultations || []);
      setTotal(res.data.pagination?.total ?? 0);
    } catch (e) {
      console.error('Błąd pobierania konsultacji:', e);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  // Reload when page or rowsPerPage changes
  useEffect(() => {
    fetchConsultations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  // Debounced search: reset to page 0
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      fetchConsultations(0, rowsPerPage, search);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), 'dd MMM yyyy', { locale: pl }) : '—';

  // Data is already paginated by the server — no local slice needed

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
            }}
          >
            <EventNote fontSize="large" sx={{ color: '#1976d2' }} />
            Konsultacje
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Lista wszystkich konsultacji. Kliknij, aby zobaczyć szczegóły.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/patients')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' },
          }}
        >
          Nowa konsultacja
        </Button>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Szukaj po nazwisku lub imieniu pacjenta…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
          <CircularProgress />
        </Box>
      ) : consultations.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <EventNote sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Brak konsultacji
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Konsultacje dodajesz z karty pacjenta.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Person />}
            onClick={() => navigate('/patients')}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Przejdź do pacjentów
          </Button>
        </Paper>
      ) : isMobile ? (
        <Grid container spacing={2}>
          {consultations.map((c) => (
            <Grid key={c.id} size={{ xs: 12 }}>
              <Card
                onClick={() => navigate(`/consultations/${c.id}`)}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 2,
                    borderColor: '#1976d2',
                    bgcolor: alpha('#1976d2', 0.02),
                  },
                }}
              >
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2' }}>
                      {c.patient.firstName[0]}
                      {c.patient.lastName[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {c.patient.firstName} {c.patient.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(c.consultationDate)}
                        {c.doctor?.name ? ` • ${c.doctor.name}` : ''}
                      </Typography>
                    </Box>
                    {c.isArchived && (
                      <Chip label="Zarchiwizowana" size="small" color="default" />
                    )}
                    <ChevronRight sx={{ color: 'text.secondary' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha('#1976d2', 0.04) }}>
                <TableCell sx={{ fontWeight: 600 }}>Pacjent</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Data konsultacji</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Lekarz</TableCell>
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
                    '&:hover': { bgcolor: alpha('#1976d2', 0.04) },
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', fontSize: '0.875rem' }}>
                        {c.patient.firstName[0]}
                        {c.patient.lastName[0]}
                      </Avatar>
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
                  <TableCell>{formatDate(c.consultationDate)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {c.doctor?.name ?? '—'}
                      {c.isArchived && <Chip label="Zarchiwizowana" size="small" />}
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
          />
        </TableContainer>
      )
      }
    </Box >
  );
}
