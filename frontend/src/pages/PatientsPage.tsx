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
  Stack,
  alpha,
  Container,
} from '@mui/material';
import { Add, Visibility, Delete, Search, Person, Download, Restore, DeleteForever, Archive, Phone, Email } from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    patientId: string | null;
    patientName: string;
  }>({ open: false, patientId: null, patientName: '' });
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    patientId: string | null;
    patientName: string;
  }>({ open: false, patientId: null, patientName: '' });
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<{
    open: boolean;
    patientId: string | null;
    patientName: string;
  }>({ open: false, patientId: null, patientName: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Check if user can export (ADMIN or DOCTOR)
  const canExport = user?.role === 'ADMIN' || user?.role === 'DOCTOR';
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchPatients();
  }, [page, rowsPerPage, search, showArchived]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/patients', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search,
          archived: showArchived,
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

  const handleRestoreClick = (patientId: string, patientName: string) => {
    setRestoreDialog({ open: true, patientId, patientName });
  };

  const handleRestoreConfirm = async () => {
    if (!restoreDialog.patientId) return;

    try {
      setError('');
      setSuccess('');
      await api.post(`/patients/${restoreDialog.patientId}/restore`);
      setSuccess('Pacjent został przywrócony');
      setRestoreDialog({ open: false, patientId: null, patientName: '' });
      fetchPatients();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd podczas przywracania pacjenta');
    }
  };

  const handleRestoreCancel = () => {
    setRestoreDialog({ open: false, patientId: null, patientName: '' });
  };

  const handlePermanentDeleteClick = (patientId: string, patientName: string) => {
    setPermanentDeleteDialog({ open: true, patientId, patientName });
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!permanentDeleteDialog.patientId) return;

    try {
      setError('');
      setSuccess('');
      await api.delete(`/patients/${permanentDeleteDialog.patientId}/permanent`);
      setSuccess('Pacjent i wszystkie dane zostały trwale usunięte zgodnie z RODO');
      setPermanentDeleteDialog({ open: false, patientId: null, patientName: '' });
      fetchPatients();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Błąd podczas trwałego usuwania pacjenta');
    }
  };

  const handlePermanentDeleteCancel = () => {
    setPermanentDeleteDialog({ open: false, patientId: null, patientName: '' });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError('');

      const response = await api.get('/export/patients/zip', {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('download', `eksport-pacjentow-${timestamp}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('Eksport zakończony pomyślnie');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Błąd eksportu:', err);
      setError(err.response?.data?.error || 'Błąd podczas eksportu danych');
    } finally {
      setExporting(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: { xs: 1.5, sm: 2 },
          gap: { xs: 1.5, sm: 2 },
        }}>
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                mb: 1,
                fontSize: { xs: '1.75rem', sm: '2.5rem' },
                background: 'linear-gradient(135deg, #007AFF 0%, #00C7BE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Pacjenci
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 500 }}
            >
              Zarządzaj bazą pacjentów i ich historią medyczną
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex',
            gap: { xs: 1, sm: 2 },
            flexWrap: 'wrap',
            width: { xs: '100%', sm: 'auto' },
            '& > *': {
              flex: { xs: '1 1 auto', sm: '0 0 auto' },
              minWidth: { xs: 'auto', sm: '120px' },
            },
          }}>
            <Button
              variant={showArchived ? 'outlined' : 'contained'}
              startIcon={<Archive />}
              onClick={() => {
                setShowArchived(!showArchived);
                setPage(0);
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
              }}
              size={isMobile ? 'small' : 'medium'}
            >
              {showArchived ? 'Aktywni' : 'Zarchiwizowani'}
            </Button>
            {canExport && !showArchived && (
              <Button
                variant="outlined"
                startIcon={exporting ? <CircularProgress size={20} /> : <Download />}
                onClick={handleExport}
                disabled={exporting}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1.5, sm: 2 },
                }}
                size={isMobile ? 'small' : 'medium'}
              >
                {exporting ? (isMobile ? 'Eksport...' : 'Eksportowanie...') : (isMobile ? 'Eksport' : 'Eksportuj dane')}
              </Button>
            )}
            {!showArchived && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/patients/new')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  px: { xs: 2, sm: 3 },
                  py: 1.2,
                }}
                size={isMobile ? 'medium' : 'medium'}
                fullWidth={isMobile}
              >
                {isMobile ? 'NOWY PACJENT' : 'NOWY PACJENT'}
              </Button>
            )}
          </Box>
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

        <Paper
          sx={{
            p: { xs: 1, sm: 2 },
            mb: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <TextField
            fullWidth
            placeholder={isMobile ? "Szukaj pacjenta..." : "Szukaj po imieniu, nazwisku, nr telefonu lub emailu..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            size={isMobile ? 'small' : 'medium'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'primary.main' }} fontSize={isMobile ? 'small' : 'medium'} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2.5 }
            }}
          />
        </Paper>

        {isMobile ? (
          <Grid container spacing={2}>
            {loading ? (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              </Grid>
            ) : patients.length === 0 ? (
              <Grid size={{ xs: 12 }}>
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
                <Grid size={{ xs: 12 }} key={patient.id}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease-in-out',
                      '&:active': { transform: 'scale(0.98)' },
                    }}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              width: 50,
                              height: 50,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: 'primary.main',
                              fontWeight: 700,
                              fontSize: '1.2rem',
                              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                            }}
                          >
                            {getInitials(patient.firstName, patient.lastName)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {patient.firstName} {patient.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {patient.age ? `${patient.age} lat` : 'Wiek nieznany'} • {patient.gender === 'MALE' ? 'Mężczyzna' : 'Kobieta'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex' }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}`);
                            }}
                            sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05), mr: 0.5 }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(patient.id, `${patient.firstName} ${patient.lastName}`);
                            }}
                            sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      <Stack spacing={1}>
                        {patient.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                              {patient.phone}
                            </Typography>
                          </Box>
                        )}
                        {patient.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography noWrap variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                              {patient.email}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    Imię i nazwisko
                  </TableCell>
                  <TableCell sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                  }}>
                    Wiek
                  </TableCell>
                  <TableCell sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                  }}>
                    Płeć
                  </TableCell>
                  <TableCell sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', md: 'table-cell' },
                  }}>
                    Telefon
                  </TableCell>
                  <TableCell sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', lg: 'table-cell' },
                  }}>
                    Email
                  </TableCell>
                  <TableCell align="right" sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    whiteSpace: 'nowrap',
                  }}>
                    Akcje
                  </TableCell>
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
                      <TableCell sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}>
                        {patient.age || '-'}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      }}>
                        {patient.gender && (
                          <Chip
                            label={patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'K' : '-'}
                            size="small"
                            color={patient.gender === 'MALE' ? 'primary' : 'secondary'}
                            sx={{
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 },
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: { xs: 'none', md: 'table-cell' },
                      }}>
                        {patient.phone || '-'}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: { xs: 'none', lg: 'table-cell' },
                        maxWidth: { lg: 200 },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {patient.email || '-'}
                      </TableCell>
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
                        {showArchived ? (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreClick(
                                  patient.id,
                                  `${patient.firstName} ${patient.lastName}`
                                );
                              }}
                              title="Przywróć pacjenta"
                            >
                              <Restore />
                            </IconButton>
                            {isAdmin && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePermanentDeleteClick(
                                    patient.id,
                                    `${patient.firstName} ${patient.lastName}`
                                  );
                                }}
                                title="Trwale usuń (RODO)"
                              >
                                <DeleteForever />
                              </IconButton>
                            )}
                          </>
                        ) : (
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
                        )}
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
              labelRowsPerPage={isMobile ? "Na stronie:" : "Wierszy na stronę:"}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  gap: 1,
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            />
          </TableContainer>
        )}

        <Dialog
          open={deleteDialog.open}
          onClose={handleDeleteCancel}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              m: { xs: 2, sm: 3 },
              width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            },
          }}
        >
          <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Potwierdzenie usunięcia
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Czy na pewno chcesz zarchiwizować pacjenta <strong>{deleteDialog.patientName}</strong>?
              <Typography
                variant="body2"
                color="warning.main"
                sx={{
                  mt: 2,
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: 'warning.50',
                  borderRadius: 1,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
              >
                ⚠️ Uwaga: Pacjent zostanie zarchiwizowany (soft delete). Wszystkie powiązane dane pozostaną w systemie.
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            <Button
              onClick={handleDeleteCancel}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
            >
              Zarchiwizuj
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={restoreDialog.open}
          onClose={handleRestoreCancel}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              m: { xs: 2, sm: 3 },
              width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            },
          }}
        >
          <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Przywróć pacjenta
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Czy na pewno chcesz przywrócić pacjenta <strong>{restoreDialog.patientName}</strong>?
              Pacjent zostanie przywrócony do aktywnej listy.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            <Button
              onClick={handleRestoreCancel}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleRestoreConfirm}
              color="success"
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
            >
              Przywróć
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={permanentDeleteDialog.open}
          onClose={handlePermanentDeleteCancel}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              m: { xs: 2, sm: 3 },
              width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            },
          }}
        >
          <DialogTitle sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Trwałe usunięcie danych (RODO)
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              <strong>UWAGA: Ta operacja jest nieodwracalna!</strong>
              <br /><br />
              Czy na pewno chcesz trwale usunąć pacjenta <strong>{permanentDeleteDialog.patientName}</strong> i wszystkie powiązane dane?
              <br /><br />
              Zostaną usunięte:
              <ul style={{
                marginLeft: isMobile ? '16px' : '20px',
                paddingLeft: isMobile ? '8px' : '12px',
                fontSize: isMobile ? '0.875rem' : '1rem',
              }}>
                <li>Wszystkie konsultacje</li>
                <li>Wszystkie wyniki badań</li>
                <li>Wszystkie zdjęcia skóry głowy (również pliki)</li>
                <li>Wszystkie plany opieki</li>
                <li>Historia emaili</li>
                <li>Wszystkie przypomnienia</li>
              </ul>
              Ta operacja jest zgodna z RODO i nie może być cofnięta.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            <Button
              onClick={handlePermanentDeleteCancel}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </Button>
            <Button
              onClick={handlePermanentDeleteConfirm}
              color="error"
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
            >
              Trwale usuń
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
