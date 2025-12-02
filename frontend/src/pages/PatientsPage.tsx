import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  Chip,
  CircularProgress,
  Avatar,
  Container,
} from '@mui/material';
import { Add, Visibility, Delete, Search, Person } from '@mui/icons-material';
import { api } from '../services/api';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  isArchived: boolean;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    patientId: string | null;
    patientName: string;
  }>({ open: false, patientId: null, patientName: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchPatients();
  }, [page, rowsPerPage, search]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/patients', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search,
          archived: false,
        },
      });
      setPatients(response.data.patients);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Błąd pobierania pacjentów:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (patientId: string, patientName: string) => {
    setDeleteDialog({ open: true, patientId, patientName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.patientId) return;

    try {
      setError('');
      setSuccess('');
      await api.delete(`/patients/${deleteDialog.patientId}`);
      setSuccess('Pacjent został zarchiwizowany');
      setDeleteDialog({ open: false, patientId: null, patientName: '' });
      fetchPatients();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd podczas usuwania pacjenta');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, patientId: null, patientName: '' });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Pacjenci
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Zarządzaj danymi pacjentów i ich konsultacjami
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/patients/new')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            NOWY PACJENT
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Szukaj (imię, nazwisko, telefon, email)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {isMobile ? (
          <Grid container spacing={2}>
            {loading ? (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              </Grid>
            ) : patients.length === 0 ? (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary">Brak pacjentów</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              patients.map((patient) => (
                <Grid item xs={12} sm={6} key={patient.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 4 },
                      transition: 'box-shadow 0.2s',
                    }}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 'bold' }}>
                            {getInitials(patient.firstName, patient.lastName)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {patient.firstName} {patient.lastName}
                            </Typography>
                            {patient.age && (
                              <Typography variant="body2" color="text.secondary">
                                {patient.age} lat
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}`);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(
                                patient.id,
                                `${patient.firstName} ${patient.lastName}`
                              );
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {patient.gender && (
                          <Chip
                            label={patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : '-'}
                            size="small"
                            color={patient.gender === 'MALE' ? 'primary' : 'secondary'}
                            sx={{ width: 'fit-content' }}
                          />
                        )}
                        {patient.phone && (
                          <Typography variant="body2" color="text.secondary">
                            📞 {patient.phone}
                          </Typography>
                        )}
                        {patient.email && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            ✉️ {patient.email}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Imię i nazwisko</TableCell>
                  <TableCell>Wiek</TableCell>
                  <TableCell>Płeć</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Akcje</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary">Brak pacjentów</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {getInitials(patient.firstName, patient.lastName)}
                          </Avatar>
                          <Typography sx={{ fontWeight: 500 }}>
                            {patient.firstName} {patient.lastName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{patient.age || '-'}</TableCell>
                      <TableCell>
                        {patient.gender && (
                          <Chip
                            label={patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : '-'}
                            size="small"
                            color={patient.gender === 'MALE' ? 'primary' : 'secondary'}
                          />
                        )}
                      </TableCell>
                      <TableCell>{patient.phone || '-'}</TableCell>
                      <TableCell>{patient.email || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${patient.id}`);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(
                              patient.id,
                              `${patient.firstName} ${patient.lastName}`
                            );
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Wierszy na stronę:"
            />
          </TableContainer>
        )}

        <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
          <DialogTitle>Potwierdzenie usunięcia</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Czy na pewno chcesz zarchiwizować pacjenta <strong>{deleteDialog.patientName}</strong>?
              <Typography variant="body2" color="warning.main" sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                ⚠️ Uwaga: Pacjent zostanie zarchiwizowany (soft delete). Wszystkie powiązane dane pozostaną w systemie.
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>Anuluj</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Zarchiwizuj
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
