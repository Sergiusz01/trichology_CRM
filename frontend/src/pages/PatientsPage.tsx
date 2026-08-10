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
  Menu,
  Skeleton,
} from '@mui/material';
import { AppCard, AppButton, AppTextField, PageHeader } from '../ui';
import { Add, Visibility, Delete, Search, Person, Download, Restore, DeleteForever, Archive, Phone, Email, ArrowUpward, ArrowDownward, MoreVert, ChevronRight } from '@mui/icons-material';
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
import { formatPhone } from '../utils/formatPhone';

const getInitials = (firstName: string, lastName: string) => {
  return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
};

const getDeterministicColor = (id: string) => {
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
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<{ id: string, anchor: HTMLElement, patientName: string } | null>(null);
  
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

  const isEmptyDb = total === 0 && !search && !showArchived;

  if (!loading && isEmptyDb) {
    return (
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <PageHeader title="Pacjenci" subtitle="Zarządzaj bazą pacjentów i ich historią medyczną" />
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: { xs: 3, md: 8 }, bgcolor: 'background.paper', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'action.hover', color: 'text.disabled', mb: 3 }}>
              <Person sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography sx={{ fontWeight: 500, color: 'text.primary', mb: 1, fontSize: '18px' }}>
              Brak pacjentów w bazie
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, maxWidth: 400, fontSize: '13px' }}>
              Lista pacjentów jest obecnie pusta. Dodaj pierwszego pacjenta, aby rozpocząć budowanie bazy i historii leczenia.
            </Typography>
            <AppButton
              variant="contained"
              disableElevation
              startIcon={<Add fontSize="small" />}
              onClick={() => navigate('/patients/new')}
              size="small"
              sx={{ height: 32, textTransform: 'none', fontWeight: 500 }}
            >
              Dodaj pierwszego pacjenta
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
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
                {isMobile ? (
                  <>
                    <AppButton
                      variant="contained"
                      disableElevation
                      startIcon={<Add />}
                      onClick={() => navigate('/patients/new')}
                      size="small"
                      sx={{ height: 32, flex: 1, textTransform: 'none', fontWeight: 500 }}
                    >
                      Dodaj pacjenta
                    </AppButton>
                    <IconButton
                      size="small"
                      onClick={(e) => setHeaderMenuAnchor(e.currentTarget)}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: 32, width: 32 }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                    <Menu
                      anchorEl={headerMenuAnchor}
                      open={Boolean(headerMenuAnchor)}
                      onClose={() => setHeaderMenuAnchor(null)}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                      PaperProps={{ elevation: 2, sx: { minWidth: 180, mt: 0.5, borderRadius: 2 } }}
                    >
                      <MenuItem onClick={() => { setShowArchived(!showArchived); setPage(0); setHeaderMenuAnchor(null); }} sx={{ fontSize: '14px' }}>
                        <Archive fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                        {showArchived ? 'Aktywni' : 'Zarchiwizowani'}
                      </MenuItem>
                      {canExport && !showArchived && (
                        <MenuItem onClick={() => { handleExport(); setHeaderMenuAnchor(null); }} disabled={exporting} sx={{ fontSize: '14px' }}>
                          {exporting ? <CircularProgress size={16} sx={{ mr: 1.5 }} /> : <Download fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />}
                          Eksportuj
                        </MenuItem>
                      )}
                    </Menu>
                  </>
                ) : (
                  <>
                    <AppButton
                      variant={showArchived ? 'contained' : 'outlined'}
                      startIcon={<Archive fontSize="small" />}
                      onClick={() => { setShowArchived(!showArchived); setPage(0); }}
                      size="small"
                      sx={{ height: 32, textTransform: 'none', fontWeight: 500 }}
                    >
                      {showArchived ? 'Aktywni' : 'Zarchiwizowani'}
                    </AppButton>
                    {canExport && !showArchived && (
                      <AppButton
                        variant="outlined"
                        startIcon={exporting ? <CircularProgress size={16} /> : <Download fontSize="small" />}
                        onClick={handleExport}
                        disabled={exporting}
                        size="small"
                        sx={{ height: 32, textTransform: 'none', fontWeight: 500 }}
                      >
                        {exporting ? 'Eksport...' : 'Eksportuj'}
                      </AppButton>
                    )}
                    {!showArchived && (
                      <AppButton
                        variant="contained"
                        disableElevation
                        startIcon={<Add fontSize="small" />}
                        onClick={() => navigate('/patients/new')}
                        size="small"
                        sx={{ height: 32, textTransform: 'none', fontWeight: 500 }}
                      >
                        Dodaj pacjenta
                      </AppButton>
                    )}
                  </>
                )}
              </Box>
          }
        />

        {loadError && (
          <ErrorRetry message={loadError} onRetry={() => refetchPatients()} />
        )}

        <Box
          sx={{
            display: 'flex', 
            gap: 2, 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            pb: 2,
            mb: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ flex: 1, maxWidth: { md: 420 } }}>
            <AppTextField
              name="search"
              fullWidth
              placeholder={isMobile ? "Szukaj pacjenta..." : "Szukaj po imieniu, nazwisku, nr telefonu lub emailu..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, height: 36, bgcolor: 'background.paper', '& fieldset': { borderColor: 'divider' } }
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flex: { xs: 1, md: 'none' } }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as any); setPage(0); }}
                sx={{ 
                  borderRadius: 2, height: 36, bgcolor: 'background.paper',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }
                }}
                IconComponent={() => (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      setPage(0);
                    }}
                    sx={{ mr: 0.5, transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}
                  >
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                )}
              >
                <MenuItem value="createdAt">Data dodania</MenuItem>
                <MenuItem value="lastName">Imię i nazwisko (A-Z)</MenuItem>
                <MenuItem value="lastVisit">Wiek</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {loading ? <Skeleton width={60} /> : (search || showArchived) ? `${total} wynik${total === 1 ? '' : (total > 1 && total < 5) ? 'i' : 'ów'} dla "${search}"` : `${total} pacjentów`}
            </Typography>
          </Box>
        </Box>

        {isMobile ? (
          <Grid container spacing={1.5} sx={{ pb: 4 }}>
            {loading ? (
              Array.from(new Array(4)).map((_, idx) => (
                <Grid size={{ xs: 12 }} key={idx}>
                  <Card elevation={0} sx={{ p: 1.5, display: 'flex', gap: 1.5, border: '1px solid divider', borderRadius: 3 }}>
                    <Skeleton variant="circular" width={36} height={36} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" />
                      <Skeleton width="40%" />
                      <Skeleton width="50%" />
                    </Box>
                  </Card>
                </Grid>
              ))
            ) : patients.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">Nie znaleziono pasujących pacjentów</Typography>
                </Box>
              </Grid>
            ) : (
              <>
                {patients.map((patient) => {
                  const avatarColor = getDeterministicColor(patient.id);
                  return (
                    <Grid size={{ xs: 12 }} key={patient.id}>
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 3,
                          cursor: 'pointer',
                          minHeight: 64,
                          display: 'flex',
                          alignItems: 'stretch',
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                          <Avatar sx={{ bgcolor: avatarColor.bg, color: avatarColor.color, width: 36, height: 36, fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>
                            {getInitials(patient.firstName, patient.lastName)}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography sx={{ fontWeight: 500, fontSize: '14px', textTransform: 'none', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {patient.firstName} {patient.lastName}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              <Typography sx={{ fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                {patient.age ? `${patient.age} lat` : 'Wiek nieznany'} • {patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : '—'}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: '12px', color: 'text.secondary', fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
                              {formatPhone(patient.phone) || '—'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileMenuAnchor({ id: patient.id, anchor: e.currentTarget, patientName: `${patient.firstName} ${patient.lastName}` });
                            }}
                            sx={{ width: 32, height: 32 }}
                          >
                            <MoreVert fontSize="small" color="action" />
                          </IconButton>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
                <Menu
                  anchorEl={mobileMenuAnchor?.anchor}
                  open={Boolean(mobileMenuAnchor)}
                  onClose={() => setMobileMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{ elevation: 2, sx: { minWidth: 160, borderRadius: 2 } }}
                >
                  <MenuItem onClick={() => { navigate(`/patients/${mobileMenuAnchor?.id}`); setMobileMenuAnchor(null); }} sx={{ fontSize: '14px' }}>
                    <Visibility fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                    Podgląd
                  </MenuItem>
                  {showArchived ? (
                    <>
                      <MenuItem onClick={() => { handleRestoreClick(mobileMenuAnchor!.id, mobileMenuAnchor!.patientName); setMobileMenuAnchor(null); }} sx={{ fontSize: '14px' }}>
                        <Restore fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} />
                        Przywróć
                      </MenuItem>
                      {isAdmin && (
                        <MenuItem onClick={() => { handlePermanentDeleteClick(mobileMenuAnchor!.id, mobileMenuAnchor!.patientName); setMobileMenuAnchor(null); }} sx={{ fontSize: '14px', color: 'error.main' }}>
                          <DeleteForever fontSize="small" sx={{ mr: 1.5, color: 'inherit' }} />
                          Trwale usuń
                        </MenuItem>
                      )}
                    </>
                  ) : (
                    <MenuItem onClick={() => { handleDeleteClick(mobileMenuAnchor!.id, mobileMenuAnchor!.patientName); setMobileMenuAnchor(null); }} sx={{ fontSize: '14px', color: 'error.main' }}>
                      <Delete fontSize="small" sx={{ mr: 1.5, color: 'inherit' }} />
                      Usuń
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Grid>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Table sx={{ minWidth: 650, '& .MuiTableCell-root': { py: 1.5 } }}>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 500, color: 'text.secondary' }}>
                    Imię i nazwisko
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 500, color: 'text.secondary' }}>
                    Wiek
                  </TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 500, color: 'text.secondary' }}>
                    Płeć
                  </TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 500, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                    Telefon
                  </TableCell>
                  <TableCell sx={{ fontSize: '12px', fontWeight: 500, color: 'text.secondary', display: { xs: 'none', lg: 'table-cell' } }}>
                    Email
                  </TableCell>
                  {user?.role !== 'DOCTOR' && (
                    <TableCell sx={{ fontSize: '12px', fontWeight: 500, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                      Lekarz prowadzący
                    </TableCell>
                  )}
                  <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 500, color: 'text.secondary' }}>
                    Akcje
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from(new Array(8)).map((_, idx) => (
                    <TableRow key={idx} sx={{ height: 56 }}>
                      <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Skeleton variant="circular" width={32} height={32} /><Skeleton width={120} /></Box></TableCell>
                      <TableCell align="right"><Skeleton width={20} sx={{ ml: 'auto' }} /></TableCell>
                      <TableCell><Skeleton width={60} /></TableCell>
                      <TableCell display={{ xs: 'none', md: 'table-cell' }}><Skeleton width={100} /></TableCell>
                      <TableCell display={{ xs: 'none', lg: 'table-cell' }}><Skeleton width={140} /></TableCell>
                      {user?.role !== 'DOCTOR' && <TableCell display={{ xs: 'none', md: 'table-cell' }}><Skeleton width={100} /></TableCell>}
                      <TableCell align="right"><Skeleton width={60} sx={{ ml: 'auto' }} /></TableCell>
                    </TableRow>
                  ))
                ) : patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role !== 'DOCTOR' ? 7 : 6} align="center" sx={{ py: 8 }}>
                      <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary" sx={{ fontWeight: 500 }}>Nie znaleziono pasujących pacjentów</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => {
                    const avatarColor = getDeterministicColor(patient.id);
                    return (
                      <TableRow
                        key={patient.id}
                        sx={{ 
                          height: 56, 
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                          '&:hover': { bgcolor: 'action.hover', '& .row-actions': { opacity: 1 } },
                        }}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: avatarColor.bg, color: avatarColor.color, width: 32, height: 32, fontSize: '12px', fontWeight: 500 }}>
                              {getInitials(patient.firstName, patient.lastName)}
                            </Avatar>
                            <Typography sx={{ fontWeight: 500, fontSize: '14px', textTransform: 'none' }}>
                              {patient.firstName} {patient.lastName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                          {patient.age || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13px', color: 'text.secondary' }}>
                          {patient.gender === 'MALE' ? 'Mężczyzna' : patient.gender === 'FEMALE' ? 'Kobieta' : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums', display: { xs: 'none', md: 'table-cell' } }}>
                          {formatPhone(patient.phone) || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13px', color: 'text.secondary', display: { xs: 'none', lg: 'table-cell' }, maxWidth: { lg: 200 }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {patient.email || '—'}
                        </TableCell>
                        {user?.role !== 'DOCTOR' && (
                          <TableCell sx={{ fontSize: '13px', display: { xs: 'none', md: 'table-cell' } }}>
                            {patient.assignedDoctor ? (
                              <Typography variant="body2" sx={{ fontSize: '13px' }}>{patient.assignedDoctor.name}</Typography>
                            ) : (
                              <Typography variant="body2" color="text.disabled" sx={{ fontSize: '13px' }}>—</Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <Box className="row-actions" sx={{ opacity: 0.5, transition: 'opacity 0.2s', display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}
                              sx={{ width: 32, height: 32 }}
                              aria-label="Podgląd"
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                            {showArchived ? (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={(e) => { e.stopPropagation(); handleRestoreClick(patient.id, `${patient.firstName} ${patient.lastName}`); }}
                                  title="Przywróć pacjenta"
                                  sx={{ width: 32, height: 32 }}
                                >
                                  <Restore fontSize="small" />
                                </IconButton>
                                {isAdmin && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); handlePermanentDeleteClick(patient.id, `${patient.firstName} ${patient.lastName}`); }}
                                    title="Trwale usuń (RODO)"
                                    sx={{ width: 32, height: 32, '&:hover': { color: 'error.main', bgcolor: 'error.50' } }}
                                  >
                                    <DeleteForever fontSize="small" />
                                  </IconButton>
                                )}
                              </>
                            ) : (
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(patient.id, `${patient.firstName} ${patient.lastName}`); }}
                                sx={{ width: 32, height: 32, '&:hover': { color: 'error.main', bgcolor: 'error.50' } }}
                                aria-label="Usuń pacjenta"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
