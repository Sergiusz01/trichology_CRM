import { useState, useEffect, useMemo } from 'react';
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
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    Add,
    EventAvailable,
    ChevronRight,
    Search,
} from '@mui/icons-material';
import { api } from '../services/api';
import { ErrorState } from '../ui/ErrorState';

interface Visit {
    id: string;
    data: string;
    rodzajZabiegu: string;
    status: 'ZAPLANOWANA' | 'ODBYTA' | 'NIEOBECNOSC' | 'ANULOWANA';
    cena?: number;
    notatki?: string;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

const VISIT_STATUS_CONFIG = {
    ZAPLANOWANA: { color: 'primary.main', bgColor: 'rgba(0, 122, 255, 0.1)', label: 'Zaplanowana' },
    ODBYTA: { color: 'success.main', bgColor: 'rgba(52, 199, 89, 0.1)', label: 'Odbyta' },
    NIEOBECNOSC: { color: 'warning.main', bgColor: 'rgba(255, 149, 0, 0.1)', label: 'Nieobecność' },
    ANULOWANA: { color: 'error.main', bgColor: 'rgba(255, 59, 48, 0.1)', label: 'Anulowana' },
};

export default function VisitsPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtering and pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const fetchVisits = async () => {
        try {
            setLoading(true);
            const res = await api.get('/visits');
            setVisits(res.data.data || []);
            setError(null);
        } catch (e: any) {
            console.error('Błąd pobierania wizyt:', e);
            setError(e.response?.data?.error || 'Nie udało się załadować wizyt. Spróbuj ponownie.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisits();
    }, []);

    const filteredVisits = useMemo(() => {
        return visits.filter(v => {
            let match = true;
            if (statusFilter && v.status !== statusFilter) match = false;
            if (search) {
                const searchLower = search.toLowerCase();
                const patientName = `${v.patient.firstName} ${v.patient.lastName}`.toLowerCase();
                const rodzaj = (v.rodzajZabiegu || '').toLowerCase();
                if (!patientName.includes(searchLower) && !rodzaj.includes(searchLower)) {
                    match = false;
                }
            }
            if (startDate && new Date(v.data) < new Date(startDate)) match = false;
            if (endDate && new Date(v.data) > new Date(endDate + 'T23:59:59')) match = false;
            return match;
        });
    }, [visits, search, statusFilter, startDate, endDate]);

    const paginatedVisits = useMemo(() => {
        const startIdx = page * rowsPerPage;
        return filteredVisits.slice(startIdx, startIdx + rowsPerPage);
    }, [filteredVisits, page, rowsPerPage]);

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
                        <EventAvailable fontSize="large" sx={{ color: 'secondary.main' }} />
                        Wizyty i zabiegi
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Lista wszystkich wizyt pacjentów z możliwością wyszukiwania i filtrowania.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/visits/new')}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: 'secondary.main',
                        '&:hover': { bgcolor: 'secondary.dark' },
                    }}
                >
                    Nowa wizyta
                </Button>
            </Box>

            {/* Filters */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Szukaj po pacjencie lub zabiegu..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="">Wszystkie</MenuItem>
                                <MenuItem value="ZAPLANOWANA">Zaplanowana</MenuItem>
                                <MenuItem value="ODBYTA">Odbyta</MenuItem>
                                <MenuItem value="NIEOBECNOSC">Nieobecność</MenuItem>
                                <MenuItem value="ANULOWANA">Anulowana</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Od"
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPage(0);
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Do"
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPage(0);
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <ErrorState message={error} onRetry={fetchVisits} />
            ) : filteredVisits.length === 0 ? (
                <Paper
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <EventAvailable sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Brak wizyt
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                        Nie znaleziono wizyt spełniających kryteria.
                    </Typography>
                </Paper>
            ) : isMobile ? (
                <Grid container spacing={2}>
                    {paginatedVisits.map((v) => {
                        const statusConfig = VISIT_STATUS_CONFIG[v.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                        return (
                            <Grid key={v.id} size={{ xs: 12 }}>
                                <Card
                                    onClick={() => navigate(`/patients/${v.patient.id}`)}
                                    sx={{
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            boxShadow: 2,
                                            borderColor: 'secondary.main',
                                            bgcolor: alpha('#AF52DE', 0.02),
                                        },
                                    }}
                                >
                                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                            <Avatar sx={{ bgcolor: alpha('#AF52DE', 0.1), color: 'secondary.main' }}>
                                                {v.patient.firstName[0]}
                                                {v.patient.lastName[0]}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body1" fontWeight={600}>
                                                    {v.patient.firstName} {v.patient.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(v.data).toLocaleString('pl-PL', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </Typography>
                                            </Box>
                                            <ChevronRight sx={{ color: 'text.secondary' }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {v.rodzajZabiegu}
                                            </Typography>
                                            <Chip
                                                label={statusConfig.label}
                                                size="small"
                                                sx={{ bgcolor: statusConfig.bgColor, color: statusConfig.color, fontWeight: 600 }}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )
                    })}
                </Grid>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha('#AF52DE', 0.04) }}>
                                <TableCell sx={{ fontWeight: 600 }}>Data i godzina</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Pacjent</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Rodzaj zabiegu</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedVisits.map((v) => {
                                const statusConfig = VISIT_STATUS_CONFIG[v.status] || VISIT_STATUS_CONFIG.ZAPLANOWANA;
                                return (
                                    <TableRow
                                        key={v.id}
                                        onClick={() => navigate(`/patients/${v.patient.id}`)}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: alpha('#AF52DE', 0.04) },
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {new Date(v.data).toLocaleDateString('pl-PL', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {(() => {
                                                    const date = new Date(v.data);
                                                    return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
                                                })()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#AF52DE', 0.1), color: 'secondary.main', fontSize: '0.875rem' }}>
                                                    {v.patient.firstName[0]}
                                                    {v.patient.lastName[0]}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {v.patient.firstName} {v.patient.lastName}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {v.rodzajZabiegu}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={statusConfig.label}
                                                size="small"
                                                sx={{ bgcolor: statusConfig.bgColor, color: statusConfig.color, fontWeight: 600 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <ChevronRight sx={{ color: 'text.secondary' }} />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={filteredVisits.length}
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
            )}
        </Box>
    );
}
