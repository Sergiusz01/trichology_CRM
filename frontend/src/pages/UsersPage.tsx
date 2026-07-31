import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Checkbox,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    InputAdornment,
    Tooltip,
    Badge,
    Divider,
} from '@mui/material';
import {
    Add,
    Edit,
    LockReset,
    Block,
    CheckCircle,
    People,
    Search,
    PersonAdd,
    Close,
    DeleteForever,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { formatPhone } from '../utils/formatPhone';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    _count?: {
        patientAccess: number;
    };
}

interface PatientSummary {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
}

export default function UsersPage() {
    const { success, error: showError } = useNotification();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openPassword, setOpenPassword] = useState(false);
    const [openAccess, setOpenAccess] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'DOCTOR' });
    const [newPassword, setNewPassword] = useState('');

    // Patient access state
    const [allPatients, setAllPatients] = useState<PatientSummary[]>([]);
    const [accessPatientIds, setAccessPatientIds] = useState<Set<string>>(new Set());
    const [initialAccessIds, setInitialAccessIds] = useState<Set<string>>(new Set());
    const [patientSearch, setPatientSearch] = useState('');
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [savingAccess, setSavingAccess] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/users');
            setUsers(data);
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd podczas pobierania użytkowników');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenAdd = () => {
        setFormData({ name: '', email: '', password: '', role: 'DOCTOR' });
        setOpenAdd(true);
    };

    const handleAddUser = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            showError('Wypełnij wszystkie pola');
            return;
        }
        try {
            await api.post('/users', formData);
            success('Użytkownik został utworzony');
            setOpenAdd(false);
            fetchUsers();
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd przy tworzeniu użytkownika');
        }
    };

    const handleEditToggleStatus = async (user: User) => {
        try {
            await api.put(`/users/${user.id}`, { isActive: !user.isActive });
            success(`Użytkownik został ${!user.isActive ? 'aktywowany' : 'dezaktywowany'}`);
            fetchUsers();
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd przy zmianie statusu');
        }
    };

    const handleOpenEditRole = (user: User) => {
        setSelectedUser(user);
        setFormData({ ...formData, role: user.role });
        setOpenEdit(true);
    };

    const handleUpdateRole = async () => {
        if (!selectedUser) return;
        try {
            await api.put(`/users/${selectedUser.id}`, { role: formData.role });
            success('Zaktualizowano rolę użytkownika');
            setOpenEdit(false);
            fetchUsers();
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd przy aktualizacji roli');
        }
    };

    const handleOpenPassword = (user: User) => {
        setSelectedUser(user);
        setNewPassword('');
        setOpenPassword(true);
    };

    const handleResetPassword = async () => {
        if (!selectedUser || newPassword.length < 6) {
            showError('Hasło musi mieć minimum 6 znaków');
            return;
        }
        try {
            await api.post(`/users/${selectedUser.id}/reset-password`, { newPassword });
            success('Hasło zostało zmienione');
            setOpenPassword(false);
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd przy zmianie hasła');
        }
    };

    // ─── Patient Access Management ──────────────────────────────────────────

    const handleOpenAccess = async (user: User) => {
        setSelectedUser(user);
        setPatientSearch('');
        setOpenAccess(true);
        setLoadingPatients(true);

        try {
            // Fetch all patients + current access grants in parallel
            const [patientsRes, accessRes] = await Promise.all([
                api.get('/patients?limit=500'),
                api.get(`/users/${user.id}/patient-access`),
            ]);

            const patients: PatientSummary[] = patientsRes.data.patients || [];
            setAllPatients(patients);

            const grantedIds = new Set<string>(
                (accessRes.data.patients || []).map((p: any) => p.id)
            );
            setAccessPatientIds(grantedIds);
            setInitialAccessIds(new Set(grantedIds));
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd przy pobieraniu danych');
            setOpenAccess(false);
        } finally {
            setLoadingPatients(false);
        }
    };

    const handleTogglePatient = (patientId: string) => {
        setAccessPatientIds((prev) => {
            const next = new Set(prev);
            if (next.has(patientId)) {
                next.delete(patientId);
            } else {
                next.add(patientId);
            }
            return next;
        });
    };

    const handleSaveAccess = async () => {
        if (!selectedUser) return;
        setSavingAccess(true);
        try {
            await api.put(`/users/${selectedUser.id}/patient-access`, {
                patientIds: Array.from(accessPatientIds),
            });
            success('Uprawnienia zostały zapisane');
            setOpenAccess(false);
            fetchUsers();
        } catch (err: any) {
            showError(err.response?.data?.error || 'Błąd przy zapisywaniu uprawnień');
        } finally {
            setSavingAccess(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteDialog.user) return;
        setDeleting(true);
        try {
            await api.delete(`/users/${deleteDialog.user.id}`);
            success('Użytkownik został usunięty');
            setDeleteDialog({ open: false, user: null });
            fetchUsers();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Błąd podczas usuwania użytkownika';
            showError(msg);
            // If backend says to deactivate instead, close dialog
            if (err.response?.data?.canDeactivate) {
                setDeleteDialog({ open: false, user: null });
            }
        } finally {
            setDeleting(false);
        }
    };

    const hasChanges = useMemo(() => {
        if (accessPatientIds.size !== initialAccessIds.size) return true;
        for (const id of accessPatientIds) {
            if (!initialAccessIds.has(id)) return true;
        }
        return false;
    }, [accessPatientIds, initialAccessIds]);

    const filteredPatients = useMemo(() => {
        if (!patientSearch.trim()) return allPatients;
        const q = patientSearch.toLowerCase();
        return allPatients.filter(
            (p) =>
                p.firstName.toLowerCase().includes(q) ||
                p.lastName.toLowerCase().includes(q) ||
                (p.phone && p.phone.includes(q)) ||
                (p.email && p.email.toLowerCase().includes(q))
        );
    }, [allPatients, patientSearch]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Użytkownicy Systemu
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
                    Dodaj Użytkownika
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                            <TableCell>Imię i nazwisko</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Rola</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Dostęp do pacjentów</TableCell>

                            <TableCell>Utworzony</TableCell>
                            <TableCell align="right">Akcje</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell sx={{ fontWeight: 500 }}>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role === 'ADMIN' ? 'Administrator' : user.role === 'DOCTOR' ? 'Lekarz' : 'Asystent'}
                                        size="small"
                                        color={user.role === 'ADMIN' ? 'error' : user.role === 'DOCTOR' ? 'primary' : 'default'}
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.isActive ? 'Aktywny' : 'Zablokowany'}
                                        size="small"
                                        color={user.isActive ? 'success' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    {(user.role === 'DOCTOR' || user.role === 'ASSISTANT') && (
                                        <Chip
                                            icon={<People sx={{ fontSize: 16 }} />}
                                            label="Wszyscy pacjenci"
                                            size="small"
                                            variant="outlined"
                                            color="success"
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: pl })}
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Zresetuj hasło">
                                        <IconButton size="small" onClick={() => handleOpenPassword(user)}>
                                            <LockReset fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edytuj rolę">
                                        <IconButton size="small" onClick={() => handleOpenEditRole(user)}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={user.isActive ? 'Zablokuj' : 'Odblokuj'}>
                                        <IconButton size="small" onClick={() => handleEditToggleStatus(user)}>
                                            {user.isActive ? <Block fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}
                                        </IconButton>
                                    </Tooltip>
                                    {user.id !== currentUser?.id && (
                                        <Tooltip title="Usuń użytkownika">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => setDeleteDialog({ open: true, user })}
                                            >
                                                <DeleteForever fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    Brak użytkowników
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal: Dodaj Użytkownika */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Dodaj nowego użytkownika</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Imię i nazwisko"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <TextField
                            label="Hasło"
                            type="password"
                            fullWidth
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <TextField
                            select
                            label="Rola"
                            fullWidth
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <MenuItem value="DOCTOR">Lekarz</MenuItem>
                            <MenuItem value="ASSISTANT">Asystent</MenuItem>
                            <MenuItem value="ADMIN">Administrator</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdd(false)}>Anuluj</Button>
                    <Button variant="contained" onClick={handleAddUser}>Utwórz</Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Edytuj Rolę */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Edytuj rolę użytkownika</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        select
                        label="Rola"
                        fullWidth
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        sx={{ mt: 1 }}
                    >
                        <MenuItem value="DOCTOR">Lekarz</MenuItem>
                        <MenuItem value="ASSISTANT">Asystent</MenuItem>
                        <MenuItem value="ADMIN">Administrator</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEdit(false)}>Anuluj</Button>
                    <Button variant="contained" onClick={handleUpdateRole}>Zapisz</Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Zresetuj Hasło */}
            <Dialog open={openPassword} onClose={() => setOpenPassword(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Resetowanie hasła</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Wpisz nowe hasło dla użytkownika: <strong>{selectedUser?.name}</strong>
                    </Typography>
                    <TextField
                        label="Nowe hasło"
                        type="password"
                        fullWidth
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPassword(false)}>Anuluj</Button>
                    <Button variant="contained" onClick={handleResetPassword}>Zmień hasło</Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Uprawnienia do pacjentów */}
            <Dialog
                open={openAccess}
                onClose={() => setOpenAccess(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { maxHeight: '80vh' } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People color="primary" />
                    <Box>
                        <Typography variant="h6" component="span">
                            Uprawnienia do pacjentów
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Lekarz: <strong>{selectedUser?.name}</strong>
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {loadingPatients ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ px: 2, pt: 2, pb: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Szukaj pacjenta..."
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search fontSize="small" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: patientSearch && (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setPatientSearch('')}>
                                                    <Close fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {filteredPatients.length} pacjentów • {accessPatientIds.size} zaznaczono
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => setAccessPatientIds(new Set(allPatients.map(p => p.id)))}
                                            sx={{ minWidth: 'auto', fontSize: '0.75rem', textTransform: 'none' }}
                                        >
                                            Zaznacz wszystko
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => setAccessPatientIds(new Set())}
                                            sx={{ minWidth: 'auto', fontSize: '0.75rem', textTransform: 'none' }}
                                        >
                                            Odznacz wszystko
                                        </Button>
                                    </Box>
                                </Box>
                            </Box>
                            <Divider />
                            <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {filteredPatients.length === 0 ? (
                                    <ListItem>
                                        <ListItemText
                                            primary="Brak pacjentów"
                                            secondary={patientSearch ? 'Zmień kryteria wyszukiwania' : 'Nie znaleziono żadnych pacjentów w systemie'}
                                            sx={{ textAlign: 'center', py: 2 }}
                                        />
                                    </ListItem>
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <ListItem key={patient.id} disablePadding divider>
                                            <ListItemButton
                                                onClick={() => handleTogglePatient(patient.id)}
                                                dense
                                            >
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <Checkbox
                                                        edge="start"
                                                        checked={accessPatientIds.has(patient.id)}
                                                        tabIndex={-1}
                                                        disableRipple
                                                        size="small"
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={`${patient.lastName} ${patient.firstName}`}
                                                    secondary={[patient.phone ? formatPhone(patient.phone) : null, patient.email].filter(Boolean).join(' • ') || undefined}
                                                    primaryTypographyProps={{ fontWeight: accessPatientIds.has(patient.id) ? 600 : 400 }}
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpenAccess(false)}>Anuluj</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveAccess}
                        disabled={!hasChanges || savingAccess}
                        startIcon={savingAccess ? <CircularProgress size={16} /> : <PersonAdd />}
                    >
                        {savingAccess ? 'Zapisywanie...' : 'Zapisz uprawnienia'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Usuń użytkownika */}
            <Dialog open={deleteDialog.open} onClose={() => !deleting && setDeleteDialog({ open: false, user: null })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: 'error.main' }}>Usuń użytkownika</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Czy na pewno chcesz trwale usunąć użytkownika:
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                        {deleteDialog.user?.name} ({deleteDialog.user?.email})
                    </Typography>
                    <Alert severity="warning" sx={{ fontSize: '0.82rem' }}>
                        Tej operacji nie można cofnąć. Jeśli użytkownik ma powiązane dane w systemie, zostaniesz poinformowany o konieczności dezaktywacji konta.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog({ open: false, user: null })} disabled={deleting}>
                        Anuluj
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteUser}
                        disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForever />}
                    >
                        {deleting ? 'Usuwanie...' : 'Usuń'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
