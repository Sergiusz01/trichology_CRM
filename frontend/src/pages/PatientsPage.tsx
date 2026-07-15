import { useState } from 'react';
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
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { AppCard, AppButton, AppTextField, PageHeader } from '../ui';
import { Add, Visibility, Delete, Search, Person, Download, Restore, DeleteForever, Archive, Phone, Email, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { ErrorRetry } from '../components/ErrorRetry';
import {
  usePatients,
  useArchivePatient,
  useRestorePatient,
  usePermanentDeletePatient,
} from '../hooks/queries/usePatients';

export default function PatientsPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastName' | 'lastVisit'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
  const { success: showSuccess, error: showError } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ── React Query ────────────────────────────────────────────────────────────
  const { data, isLoading: loading, error: queryError, refetch: refetchPatients } = usePatients({
    page,
    limit: rowsPerPage,
    search,
    archived: showArchived,
    sortBy,
    sortOrder,
  });
  const patients = data?.patients ?? [];
  const total = data?.pagination.total ?? 0;
  const loadError = queryError ? (queryError as any)?.response?.data?.error ?? 'Nie udało się załadować listy pacjentów' : null;

  const archivePatient = useArchivePatient();
  const restorePatient = useRestorePatient();
  const permanentDeletePatient = usePermanentDeletePatient();

  // Check if user can export (ADMIN or DOCTOR)
  const canExport = user?.role === 'ADMIN' || user?.role === 'DOCTOR';
  const isAdmin = user?.role === 'ADMIN';

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
      await archivePatient.mutateAsync(deleteDialog.patientId);
      showSuccess('Pacjent został zarchiwizowany');
      setDeleteDialog({ open: false, patientId: null, patientName: '' });
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas usuwania pacjenta');
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
      await restorePatient.mutateAsync(restoreDialog.patientId);
      showSuccess('Pacjent został przywrócony');
      setRestoreDialog({ open: false, patientId: null, patientName: '' });
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas przywracania pacjenta');
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
      await permanentDeletePatient.mutateAsync(permanentDeleteDialog.patientId);
      showSuccess('Pacjent i wszystkie dane zostały trwale usunięte zgodnie z RODO');
      setPermanentDeleteDialog({ open: false, patientId: null, patientName: '' });
    } catch (err: any) {
      showError(err.response?.data?.error || 'Błąd podczas trwałego usuwania pacjenta');
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

      showSuccess('Eksport zakończony pomyślnie');
    } catch (err: any) {
      console.error('Błąd eksportu:', err);
      showError(err.response?.data?.error || 'Błąd podczas eksportu danych');
    } finally {
      setExporting(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isEmptyDb = total === 0 && !search && !showArchived;

  if (!loading && isEmptyDb) {
    return (
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <PageHeader title="Pacjenci" subtitle="Zarządzaj bazą pacjentów i ich historią medyczną" />
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: { xs: 3, md: 8 }, bgcolor: 'white', borderRadius: 4, border: '2px dashed', borderColor: alpha('#1976d2', 0.2) }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', mb: 3 }}>
              <Person sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 2, fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
              Brak pacjentów w bazie
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 600, fontSize: '1.1rem', lineHeight: 1.6 }}>
              Twoja lista pacjentów jest obecnie pusta. Dodaj pierwszego pacjenta, aby rozpocząć budowanie bazy i historii leczenia.
            </Typography>
            <AppButton
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/patients/new')}
              size="large"
              sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
            >
              DODAJ PIERWSZEGO PACJENTA
            </AppButton>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <PageHeader
          title="Pacjenci"
          subtitle="Zarządzaj bazą pacjentów i ich historią medyczną"
          action={
            <Box sx={{
              display: 'flex',
              gap: { xs: 1, sm: 2 },
              flexWrap: 'wrap',
              width: { xs: '100%', sm: 'auto' },
            }}>
              <AppButton
                variant={showArchived ? 'contained' : 'outlined'}
                startIcon={<Archive />}
                onClick={() => {
                  setShowArchived(!showArchived);
                  setPage(0);
                }}
                size={isMobile ? 'small' : 'medium'}
              >
                {showArchived ? 'Aktywni' : 'Zarchiwizowani'}
              </AppButton>
              {canExport && !showArchived && (
                <AppButton
                  variant="outlined"
                  startIcon={exporting ? <CircularProgress size={20} /> : <Download />}
                  onClick={handleExport}
                  disabled={exporting}
                  size={isMobile ? 'small' : 'medium'}
                >
                  {exporting ? (isMobile ? 'Eksport...' : 'Eksportowanie...') : (isMobile ? 'Eksport' : 'Eksportuj dane')}
                </AppButton>
              )}
              {!showArchived && (
                <AppButton
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/patients/new')}
                  size={isMobile ? 'medium' : 'medium'}
                  fullWidth={isMobile}
                >
                  NOWY PACJENT
                </AppButton>
              )}
            </Box>
          }
        />

        {loadError && (
          <ErrorRetry message={loadError} onRetry={() => refetchPatients()} />
        )}

        <AppCard
          sx={{
            p: { xs: 1, sm: 2 },
            mb: 4,
            border: 'none',
            boxShadow: 'none',
            background: 'transparent',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <AppTextField
              name="search"
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
            <Box sx={{ display: 'flex', gap: 1, minWidth: { md: 240 } }}>
              <FormControl size={isMobile ? 'small' : 'medium'} fullWidth>
                <Select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as any); setPage(0); }}
                  sx={{ borderRadius: 2.5, bgcolor: 'white' }}
                >
                  <MenuItem value="createdAt">Data dodania</MenuItem>
                  <MenuItem value="lastName">Nazwisko</MenuItem>
                  <MenuItem value="lastVisit">Ostatnia wizyta</MenuItem>
                </Select>
              </FormControl>
              <IconButton
                onClick={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setPage(0); }}
                sx={{ bgcolor: 'white', borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}
              >
                {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
              </IconButton>
            </Box>
          </Box>
        </AppCard>

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
                      <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                      <Typography color="text.secondary">Nie znaleziono pasujących pacjentów</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ) : (
              patients.map((patient) => (
                <Grid size={{ xs: 12 }} key={patient.id}>
                  <AppCard
                    noPadding
                    sx={{
                      transition: 'transform 0.2s ease-in-out',
                      cursor: 'pointer',
                      '&:hover': { transform: 'translateY(-2px)' },
                      '&:active': { transform: 'scale(0.98)' },
                    }}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <Box sx={{ p: 2.5 }}>
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
                        {user?.role !== 'DOCTOR' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                            {patient.assignedDoctor ? (
                              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                                {patient.assignedDoctor.name}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                Nieprzypisany
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  </AppCard>
                </Grid>
              ))
            )}
          </Grid>
        ) : (
          <TableContainer
            component={AppCard}
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
                  {user?.role !== 'DOCTOR' && (
                    <TableCell sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap',
                      display: { xs: 'none', md: 'table-cell' },
                    }}>
                      Lekarz prowadzący
                    </TableCell>
                  )}
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
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                      <Typography color="text.secondary" sx={{ fontWeight: 500 }}>Nie znaleziono pasujących pacjentów</Typography>
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
                      {user?.role !== 'DOCTOR' && (
                        <TableCell sx={{
                          display: { xs: 'none', md: 'table-cell' },
                        }}>
                          {patient.assignedDoctor ? (
                            <Chip
                              avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem' }}>{patient.assignedDoctor.name.charAt(0)}</Avatar>}
                              label={patient.assignedDoctor.name}
                              size="small"
                              variant="outlined"
                              color="primary"
                              sx={{ fontSize: '0.75rem', maxWidth: 160 }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
                              Nieprzypisany
                            </Typography>
                          )}
                        </TableCell>
                      )}
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
            <AppButton
              onClick={handleDeleteCancel}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </AppButton>
            <AppButton
              onClick={handleDeleteConfirm}
              variant="contained"
              color="error"
              size={isMobile ? 'small' : 'medium'}
            >
              Zarchiwizuj
            </AppButton>
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
            <AppButton
              onClick={handleRestoreCancel}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </AppButton>
            <AppButton
              onClick={handleRestoreConfirm}
              color="success"
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
            >
              Przywróć
            </AppButton>
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
            <AppButton
              onClick={handlePermanentDeleteCancel}
              size={isMobile ? 'small' : 'medium'}
            >
              Anuluj
            </AppButton>
            <AppButton
              onClick={handlePermanentDeleteConfirm}
              variant="contained"
              color="error"
              size={isMobile ? 'small' : 'medium'}
            >
              Trwale usuń
            </AppButton>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
