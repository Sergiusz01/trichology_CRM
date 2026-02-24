import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Divider,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Avatar,
    useTheme,
    Tabs,
    Tab,
    Paper,
    Switch,
    Button,
    LinearProgress,
    Tooltip,
    IconButton,
    CircularProgress,
} from '@mui/material';
import {
    Info,
    Memory,
    Update,
    Build,
    CloudDone,
    History,
    Email,
    Speed,
    NotificationsActive,
    Refresh,
    CheckCircle,
    ErrorOutline,
    AccessTime,
    Storage,
    Computer,
} from '@mui/icons-material';
import { useWebPush } from '../hooks/useWebPush';
import { api } from '../services/api';

import ActivityLogPage from './ActivityLogPage';
import EmailHistoryPage from './EmailHistoryPage';
import EmailTestPage from './EmailTestPage';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
            style={{ height: '100%' }}
        >
            {value === index && (
                <Box sx={{ pt: 3, height: '100%' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `settings-tab-${index}`,
        'aria-controls': `settings-tabpanel-${index}`,
    };
}

interface SystemStatus {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
    nodeVersion: string;
    platform: string;
    pid: number;
    memory: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
    os: {
        totalMemory: number;
        freeMemory: number;
        loadAvg: number[];
        cpus: number;
    };
    disk: {
        total: number;
        used: number;
        available: number;
    } | null;
}

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

export default function SettingsPage() {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);
    const { isSupported, isSubscribed, loading: pushLoading, subscribe, unsubscribe, sendTestNotification } = useWebPush();

    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);

    // Variables injected by GitHub Actions CI/CD
    const appVersion = import.meta.env.VITE_APP_VERSION || 'DEV-LOCAL';
    const buildDate = import.meta.env.VITE_APP_BUILD_DATE || new Date().toLocaleString('pl-PL');
    const commitMessage = import.meta.env.VITE_APP_COMMIT_MESSAGE || 'Brak danych o commitcie (środowisko lokalne)';

    const fetchSystemStatus = useCallback(async () => {
        setStatusLoading(true);
        setStatusError(null);
        try {
            const res = await api.get<SystemStatus>('/system/status');
            setSystemStatus(res.data);
        } catch (err: any) {
            const status = err?.response?.status;
            if (!err?.response) {
                setStatusError('Brak połączenia z backendem (sieć lub serwer wyłączony)');
            } else if (status === 401 || status === 403) {
                setStatusError(`Błąd autoryzacji (${status}) — zaloguj się ponownie`);
            } else if (status === 404) {
                setStatusError('Endpoint /api/system/status nie istnieje — backend wymaga ponownego deployu');
            } else {
                setStatusError(`Błąd serwera (HTTP ${status ?? '?'})`);
            }
        } finally {
            setStatusLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSystemStatus();
        const interval = setInterval(fetchSystemStatus, 30_000);
        return () => clearInterval(interval);
    }, [fetchSystemStatus]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handlePushToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            await subscribe();
        } else {
            await unsubscribe();
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                Ustawienia Systemu
            </Typography>

            <Paper sx={{ width: '100%', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    aria-label="zakładki ustawień systemu"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab icon={<Info />} iconPosition="start" label="Informacje o Wersji" {...a11yProps(0)} />
                    <Tab icon={<History />} iconPosition="start" label="Dziennik Aktywności" {...a11yProps(1)} />
                    <Tab icon={<Email />} iconPosition="start" label="Historia Emaili" {...a11yProps(2)} />
                    <Tab icon={<Speed />} iconPosition="start" label="Test Email" {...a11yProps(3)} />
                </Tabs>
            </Paper>

            {/* Tab 0: System Information (Original Settings view) */}
            <CustomTabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    {/* @ts-ignore */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
                                        <Info />
                                    </Avatar>
                                    <Typography variant="h6" fontWeight="bold">
                                        Informacje o Wdrożeniu
                                    </Typography>
                                </Box>

                                <Divider sx={{ mb: 2 }} />

                                <List disablePadding>
                                    <ListItem sx={{ py: 1.5 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <Build color="primary" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Numer Wersji (Commit Hash)"
                                            secondary={
                                                <Chip
                                                    label={appVersion}
                                                    size="small"
                                                    color={appVersion === 'DEV-LOCAL' ? 'warning' : 'success'}
                                                    sx={{ mt: 0.5, fontFamily: 'monospace' }}
                                                />
                                            }
                                        />
                                    </ListItem>

                                    <Divider component="li" />

                                    <ListItem sx={{ py: 1.5 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <Update color="primary" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Ostatnia Kompilacja"
                                            secondary={buildDate}
                                        />
                                    </ListItem>

                                    <Divider component="li" />

                                    <ListItem sx={{ py: 1.5 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <CloudDone color="primary" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Ostatnie Zmiany (Wiadomość Git)"
                                            secondary={commitMessage}
                                            secondaryTypographyProps={{
                                                component: 'div',
                                                sx: {
                                                    mt: 0.5,
                                                    p: 1.5,
                                                    bgcolor: 'action.hover',
                                                    borderRadius: 1,
                                                    fontStyle: 'italic',
                                                    color: 'text.primary',
                                                    borderLeft: `3px solid ${theme.palette.primary.main}`
                                                }
                                            }}
                                        />
                                    </ListItem>
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* @ts-ignore */}
                    <Grid item xs={12} md={6}>
                        <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                            <CardContent>
                                {/* Nagłówek karty */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar sx={{ bgcolor: theme.palette.secondary.main, mr: 2 }}>
                                        <Memory />
                                    </Avatar>
                                    <Typography variant="h6" fontWeight="bold" sx={{ flex: 1 }}>
                                        Status Serwera
                                    </Typography>
                                    <Tooltip title="Odśwież">
                                        <IconButton
                                            size="small"
                                            onClick={fetchSystemStatus}
                                            disabled={statusLoading}
                                        >
                                            {statusLoading
                                                ? <CircularProgress size={18} />
                                                : <Refresh fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                <Divider sx={{ mb: 2 }} />

                                {/* Stan ogólny */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                    {statusError ? (
                                        <Chip
                                            icon={<ErrorOutline />}
                                            label="Brak połączenia z serwerem"
                                            color="error"
                                            variant="outlined"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    ) : (
                                        <Chip
                                            icon={<CheckCircle />}
                                            label="System Operacyjny Stabilny"
                                            color="success"
                                            variant="outlined"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    )}
                                </Box>

                                {/* Parametry serwera */}
                                {systemStatus && (
                                    <List disablePadding dense>
                                        {/* Czas działania */}
                                        <ListItem sx={{ px: 0, py: 0.75 }}>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <AccessTime fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Czas działania"
                                                secondary={formatUptime(systemStatus.uptime)}
                                                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                                secondaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'text.primary' }}
                                            />
                                        </ListItem>

                                        <Divider component="li" />

                                        {/* Sterta Node.js */}
                                        <ListItem sx={{ px: 0, py: 0.75, flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', mb: 0.5 }}>
                                                <Memory fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                                    Sterta Node.js
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {formatBytes(systemStatus.memory.heapUsed)}
                                                    {' / '}
                                                    {formatBytes(systemStatus.memory.heapTotal)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: '100%', pl: 3.5 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(
                                                        (systemStatus.memory.heapUsed / systemStatus.memory.heapTotal) * 100,
                                                        100
                                                    )}
                                                    sx={{ height: 6, borderRadius: 3 }}
                                                    color={
                                                        systemStatus.memory.heapUsed / systemStatus.memory.heapTotal > 0.85
                                                            ? 'error'
                                                            : systemStatus.memory.heapUsed / systemStatus.memory.heapTotal > 0.65
                                                                ? 'warning'
                                                                : 'success'
                                                    }
                                                />
                                            </Box>
                                        </ListItem>

                                        <Divider component="li" />

                                        {/* RAM procesu (RSS) */}
                                        <ListItem sx={{ px: 0, py: 0.75 }}>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <Storage fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="RAM procesu (RSS)"
                                                secondary={formatBytes(systemStatus.memory.rss)}
                                                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                                secondaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'text.primary' }}
                                            />
                                        </ListItem>

                                        <Divider component="li" />

                                        {/* RAM systemu */}
                                        <ListItem sx={{ px: 0, py: 0.75, flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', mb: 0.5 }}>
                                                <Computer fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                                    RAM systemu
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {formatBytes(systemStatus.os.totalMemory - systemStatus.os.freeMemory)}
                                                    {' / '}
                                                    {formatBytes(systemStatus.os.totalMemory)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: '100%', pl: 3.5 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(
                                                        ((systemStatus.os.totalMemory - systemStatus.os.freeMemory) / systemStatus.os.totalMemory) * 100,
                                                        100
                                                    )}
                                                    sx={{ height: 6, borderRadius: 3 }}
                                                    color={
                                                        (systemStatus.os.totalMemory - systemStatus.os.freeMemory) / systemStatus.os.totalMemory > 0.9
                                                            ? 'error'
                                                            : (systemStatus.os.totalMemory - systemStatus.os.freeMemory) / systemStatus.os.totalMemory > 0.75
                                                                ? 'warning'
                                                                : 'primary'
                                                    }
                                                />
                                            </Box>
                                        </ListItem>

                                        <Divider component="li" />

                                        {/* Dysk SSD */}
                                        {systemStatus.disk && (
                                            <>
                                                <ListItem sx={{ px: 0, py: 0.75, flexDirection: 'column', alignItems: 'flex-start' }}>
                                                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', mb: 0.5 }}>
                                                        <Storage fontSize="small" color="action" sx={{ mr: 1.5 }} />
                                                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                                            Dysk (SSD / HDD)
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {formatBytes(systemStatus.disk.used)}
                                                            {' / '}
                                                            {formatBytes(systemStatus.disk.total)}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ width: '100%', pl: 3.5 }}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={Math.min(
                                                                (systemStatus.disk.used / systemStatus.disk.total) * 100,
                                                                100
                                                            )}
                                                            sx={{ height: 6, borderRadius: 3 }}
                                                            color={
                                                                systemStatus.disk.used / systemStatus.disk.total > 0.9
                                                                    ? 'error'
                                                                    : systemStatus.disk.used / systemStatus.disk.total > 0.75
                                                                        ? 'warning'
                                                                        : 'info'
                                                            }
                                                        />
                                                    </Box>
                                                </ListItem>
                                                <Divider component="li" />
                                            </>
                                        )}

                                        {/* CPU */}
                                        <ListItem sx={{ px: 0, py: 0.75 }}>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <Speed fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={`CPU (${systemStatus.os.cpus} rdzenie) — Load avg`}
                                                secondary={systemStatus.os.loadAvg.map(v => v.toFixed(2)).join(' / ')}
                                                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                                secondaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'text.primary' }}
                                            />
                                        </ListItem>

                                        <Divider component="li" />

                                        {/* Node.js + środowisko */}
                                        <ListItem sx={{ px: 0, py: 0.75 }}>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <Build fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Node.js / platforma / środowisko"
                                                secondary={`${systemStatus.nodeVersion} · ${systemStatus.platform} · ${systemStatus.environment}`}
                                                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                                secondaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'text.primary', fontFamily: 'monospace' }}
                                            />
                                        </ListItem>

                                        <Divider component="li" />

                                        {/* Ostatni odczyt */}
                                        <ListItem sx={{ px: 0, py: 0.75 }}>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <Update fontSize="small" color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary="Ostatni odczyt"
                                                secondary={new Date(systemStatus.timestamp).toLocaleTimeString('pl-PL')}
                                                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                                secondaryTypographyProps={{ variant: 'body2', color: 'text.primary' }}
                                            />
                                        </ListItem>
                                    </List>
                                )}

                                {statusError && (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                        {statusError}
                                    </Typography>
                                )}

                                {/* Powiadomienia push */}
                                {isSupported && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <NotificationsActive sx={{ mr: 1, color: theme.palette.text.secondary }} />
                                                <Typography variant="body1">Powiadomienia Push (Przeglądarka)</Typography>
                                            </Box>
                                            <Switch
                                                checked={isSubscribed}
                                                onChange={handlePushToggle}
                                                disabled={pushLoading}
                                                color="success"
                                            />
                                        </Box>
                                        {isSubscribed && (
                                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    size="small"
                                                    onClick={sendTestNotification}
                                                    disabled={pushLoading}
                                                    startIcon={<NotificationsActive />}
                                                >
                                                    Wyślij Powiadomienie Testowe
                                                </Button>
                                            </Box>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </CustomTabPanel>

            {/* Tab 1: Activity Log */}
            <CustomTabPanel value={tabValue} index={1}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1, sm: 2 } }}>
                    <ActivityLogPage />
                </Paper>
            </CustomTabPanel>

            {/* Tab 2: Email History */}
            <CustomTabPanel value={tabValue} index={2}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1, sm: 2 } }}>
                    <EmailHistoryPage />
                </Paper>
            </CustomTabPanel>

            {/* Tab 3: Email Test */}
            <CustomTabPanel value={tabValue} index={3}>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1, sm: 2 } }}>
                    <EmailTestPage />
                </Paper>
            </CustomTabPanel>

        </Box>
    );
}
