import React, { useState, useEffect } from 'react';
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
    CircularProgress
} from '@mui/material';
import { Add, Edit, LockReset, Block, CheckCircle } from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

export default function UsersPage() {
    const { success, error: showError } = useNotification();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openPassword, setOpenPassword] = useState(false);

    // Form state
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'DOCTOR' });
    const [newPassword, setNewPassword] = useState('');

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
                                        label={user.role}
                                        size="small"
                                        color={user.role === 'ADMIN' ? 'error' : 'primary'}
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
                                    {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: pl })}
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleOpenPassword(user)} title="Zresetuj hasło">
                                        <LockReset fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleOpenEditRole(user)} title="Edytuj rolę">
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleEditToggleStatus(user)} title={user.isActive ? 'Zablokuj' : 'Odblokuj'}>
                                        {user.isActive ? <Block fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
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
        </Box>
    );
}
