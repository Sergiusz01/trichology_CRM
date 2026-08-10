import { useState, useMemo } from 'react';
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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Skeleton,
} from '@mui/material';
import {
    Add,
    EventAvailable,
    ChevronRight,
    Search,
    ExpandMore,
    EventBusy,
} from '@mui/icons-material';
import { ErrorState } from '../ui/ErrorState';
import { useVisits } from '../hooks/queries/useVisits';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const VISIT_STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string; themeColor: 'info' | 'success' | 'error' | 'warning' | 'default' }> = {
    ZAPLANOWANA: { color: '#0288d1', bgColor: alpha('#0288d1', 0.12), label: 'Zaplanowana', themeColor: 'info' },
    POTWIERDZONA: { color: '#0288d1', bgColor: alpha('#0288d1', 0.12), label: 'Potwierdzona', themeColor: 'info' },
    ODBYTA: { color: '#2e7d32', bgColor: alpha('#2e7d32', 0.12), label: 'Odbyta', themeColor: 'success' },
    NIEOBECNOSC: { color: '#ed6c02', bgColor: alpha('#ed6c02', 0.12), label: 'Nieobecność', themeColor: 'warning' },
    ANULOWANA: { color: '#d32f2f', bgColor: alpha('#d32f2f', 0.12), label: 'Anulowana', themeColor: 'error' },
    ZMIANA_TERMINU: { color: '#ed6c02', bgColor: alpha('#ed6c02', 0.12), label: 'Zmiana terminu', themeColor: 'warning' },
};

function getDeterministicColor(id: string) {
    const colors = [
        '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55',
        '#5856D6', '#5AC8FA', '#FFCC00', '#FF3B30', '#A2845E'
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function VisitsPage() {
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

    const { data: visits = [], isLoading: loading, error: queryError, refetch } = useVisits();
    const error = queryError
        ? (queryError as any)?.response?.data?.error ?? 'Nie udało się załadować wizyt. Spróbuj ponownie.'
        : null;

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
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 2,
                    mb: 3,
                }}
            >
                <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: { xs: 20, sm: 22 }, color: 'text.primary', lineHeight: 1.2 }}>
                        Wizyty i zabiegi
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
                        Lista wszystkich wizyt pacjentów z możliwością wyszukiwania i filtrowania.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    disableElevation
                    size="small"
                    startIcon={<Add />}
                    onClick={() => navigate('/visits/new')}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 500, height: 32, width: { xs: '100%', sm: 'auto' } }}
                >
                    Nowa wizyta
                </Button>
            </Box>

            {/* Filters */}
            <Card variant="outlined" sx={{ mb: 3, borderRadius: 2, p: 1.25 }}>
                {isMobile ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Szukaj po pacjencie lub zabiegu..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                                sx: { height: 36, borderRadius: 2, fontSize: 14 }
                            }}
                        />
                        <Accordion elevation={0} disableGutters sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                            <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0.5, minHeight: 36, '& .MuiAccordionSummary-content': { my: 0 } }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>Filtry</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <FormControl fullWidth size="small">
                                    <Select
                                        displayEmpty
                                        value={statusFilter}
                                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                                        sx={{ height: 36, borderRadius: 2, fontSize: 14, color: statusFilter ? 'text.primary' : 'text.secondary' }}
                                    >
                                        <MenuItem value="">Wszystkie statusy</MenuItem>
                                        {Object.entries(VISIT_STATUS_CONFIG).map(([key, config]) => (
                                            <MenuItem key={key} value={key}>{config.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                                        InputProps={{ sx: { height: 36, borderRadius: 2, fontSize: 14 } }}
                                        error={!!(startDate && endDate && new Date(startDate) > new Date(endDate))}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                                        InputProps={{ sx: { height: 36, borderRadius: 2, fontSize: 14 } }}
                                        error={!!(startDate && endDate && new Date(startDate) > new Date(endDate))}
                                    />
                                </Box>
                                {(startDate && endDate && new Date(startDate) > new Date(endDate)) && (
                                    <Typography color="error" variant="caption">Data końcowa musi być późniejsza</Typography>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Szukaj po pacjencie lub zabiegu..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                            sx={{ flex: 1, minWidth: 220 }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                                sx: { height: 36, borderRadius: 2, fontSize: 14 }
                            }}
                        />
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                                displayEmpty
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                                sx={{ height: 36, borderRadius: 2, fontSize: 14, color: statusFilter ? 'text.primary' : 'text.secondary' }}
                            >
                                <MenuItem value="">Wszystkie statusy</MenuItem>
                                {Object.entries(VISIT_STATUS_CONFIG).map(([key, config]) => (
                                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                            sx={{ minWidth: 150 }}
                            InputProps={{ sx: { height: 36, borderRadius: 2, fontSize: 14 } }}
                            error={!!(startDate && endDate && new Date(startDate) > new Date(endDate))}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                            sx={{ minWidth: 150 }}
                            InputProps={{ sx: { height: 36, borderRadius: 2, fontSize: 14 } }}
                            error={!!(startDate && endDate && new Date(startDate) > new Date(endDate))}
                        />
                    </Box>
                )}
                {(!isMobile && startDate && endDate && new Date(startDate) > new Date(endDate)) && (
                    <Typography color="error" variant="caption" sx={{ display: 'block', mt: 0.5, ml: 1 }}>Data końcowa musi być późniejsza</Typography>
                )}
            </Card>

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 0 }}>
                    {isMobile ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <Card variant="outlined" key={i} sx={{ borderRadius: 3, p: 2 }}>
                                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1 }}>
                                    <Skeleton variant="circular" width={28} height={28} />
                                    <Skeleton variant="text" width="80%" height={24} />
                                </Box>
                                <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                                <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1.5 }} />
                            </Card>
                        ))
                    ) : (
                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <Box key={i} sx={{ display: 'flex', p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ width: '20%' }}>
                                        <Skeleton variant="text" width="80%" height={20} />
                                        <Skeleton variant="text" width="60%" height={20} />
                                    </Box>
                                    <Box sx={{ width: '30%', display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Skeleton variant="circular" width={28} height={28} />
                                        <Skeleton variant="text" width="70%" height={20} />
                                    </Box>
                                    <Box sx={{ width: '30%' }}><Skeleton variant="text" width="90%" height={20} /></Box>
                                    <Box sx={{ width: '15%' }}><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1.5 }} /></Box>
                                </Box>
                            ))}
                        </Card>
                    )}
                </Box>
            ) : error ? (
                <ErrorState message={error} onRetry={() => refetch()} />
            ) : filteredVisits.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <EventBusy sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                    <Typography sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 15, mb: 1 }}>
                        Brak wizyt
                    </Typography>
                    <Typography sx={{ color: 'text.disabled', fontSize: 13, mb: 3 }}>
                        Brak wizyt spełniających kryteria wyszukiwania.
                    </Typography>
                    {search || statusFilter || startDate || endDate ? (
                        <Button 
                            variant="text" 
                            color="inherit" 
                            onClick={() => { setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); }}
                            sx={{ textTransform: 'none' }}
                        >
                            Wyczyść filtry
                        </Button>
                    ) : (
                        <Button 
                            variant="outlined" 
                            onClick={() => navigate('/visits/new')}
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                            Zaplanuj pierwszą wizytę
                        </Button>
                    )}
                </Box>
            ) : isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {paginatedVisits.map((v) => {
                        const statusConfig = VISIT_STATUS_CONFIG[v.status] || { color: '#888', bgColor: '#eee', label: v.status, themeColor: 'default' };
                        const vDate = new Date(v.data);
                        return (
                            <Card
                                key={v.id}
                                variant="outlined"
                                onClick={() => navigate(`/patients/${v.patient.id}?tab=visits&visitId=${v.id}`)}
                                sx={{
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    p: 1.5,
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 400 }}>
                                        {format(vDate, 'EEE, d MMM', { locale: pl })} · {format(vDate, 'HH:mm')}
                                    </Typography>
                                    <ChevronRight sx={{ fontSize: 16, color: 'text.disabled' }} />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 600, bgcolor: getDeterministicColor(v.patient.id), color: '#fff' }}>
                                        {v.patient.firstName[0]}{v.patient.lastName[0]}
                                    </Avatar>
                                    <Typography sx={{ fontSize: 13.5, fontWeight: 500, textTransform: 'none' }}>
                                        {v.patient.firstName} {v.patient.lastName}
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'none', mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {v.rodzajZabiegu}
                                </Typography>
                                <Chip
                                    label={statusConfig.label}
                                    size="small"
                                    color={statusConfig.themeColor as any}
                                    sx={{ height: 22, fontSize: 11, fontWeight: 600, borderRadius: 1.5 }}
                                />
                            </Card>
                        )
                    })}
                    <TablePagination
                        component="div"
                        count={filteredVisits.length}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[10, 25, 50, { label: 'Wszystkie', value: -1 }]}
                        labelRowsPerPage=""
                        sx={{ borderBottom: 'none', '& .MuiTablePagination-toolbar': { pl: 0 } }}
                    />
                </Box>
            ) : (
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'background.paper', '& th': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', py: 1.25 }}>Data i godzina</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', py: 1.25 }}>Pacjent</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', py: 1.25 }}>Rodzaj zabiegu</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', py: 1.25 }}>Status</TableCell>
                                    <TableCell sx={{ py: 1.25, width: 40 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedVisits.map((v) => {
                                    const statusConfig = VISIT_STATUS_CONFIG[v.status] || { color: '#888', bgColor: '#eee', label: v.status, themeColor: 'default' };
                                    const vDate = new Date(v.data);
                                    return (
                                        <TableRow
                                            key={v.id}
                                            hover
                                            onClick={() => navigate(`/patients/${v.patient.id}?tab=visits&visitId=${v.id}`)}
                                            sx={{ cursor: 'pointer', '& td': { py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }, '&:last-child td': { borderBottom: 0 } }}
                                        >
                                            <TableCell>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: 'text.primary' }}>
                                                    {format(vDate, 'EEE, d MMM yyyy', { locale: pl })}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                                                    {format(vDate, 'HH:mm')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, fontWeight: 600, bgcolor: getDeterministicColor(v.patient.id), color: '#fff' }}>
                                                        {v.patient.firstName[0]}{v.patient.lastName[0]}
                                                    </Avatar>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 500, textTransform: 'none' }}>
                                                        {v.patient.firstName} {v.patient.lastName}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}>
                                                <Typography sx={{ fontSize: 13, color: 'text.secondary', textTransform: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {v.rodzajZabiegu}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={statusConfig.label}
                                                    size="small"
                                                    color={statusConfig.themeColor as any}
                                                    sx={{ height: 22, fontSize: 11, fontWeight: 600, borderRadius: 1.5 }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <ChevronRight sx={{ fontSize: 16, color: 'text.disabled' }} />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={filteredVisits.length}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[10, 25, 50, { label: 'Wszystkie', value: -1 }]}
                        labelRowsPerPage="Wierszy na stronę:"
                    />
                </Card>
            )}
        </Box>
    );
}
