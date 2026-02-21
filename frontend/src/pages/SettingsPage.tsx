import React, { useState } from 'react';
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
    Paper
} from '@mui/material';
import {
    Info,
    Memory,
    Update,
    Build,
    CloudDone,
    History,
    Email,
    Speed
} from '@mui/icons-material';

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

export default function SettingsPage() {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);

    // Variables injected by GitHub Actions CI/CD
    const appVersion = import.meta.env.VITE_APP_VERSION || 'DEV-LOCAL';
    const buildDate = import.meta.env.VITE_APP_BUILD_DATE || new Date().toLocaleString('pl-PL');
    const commitMessage = import.meta.env.VITE_APP_COMMIT_MESSAGE || 'Brak danych o commitcie (środowisko lokalne)';

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
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

                    <Grid item xs={12} md={6}>
                        <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar sx={{ bgcolor: theme.palette.secondary.main, mr: 2 }}>
                                        <Memory />
                                    </Avatar>
                                    <Typography variant="h6" fontWeight="bold">
                                        Status Działania
                                    </Typography>
                                </Box>

                                <Divider sx={{ mb: 2 }} />

                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Chip
                                        label="System Operacyjny Stabilny"
                                        color="success"
                                        variant="outlined"
                                        sx={{ mb: 2, px: 2, py: 2, fontSize: '1rem', fontWeight: 'bold' }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        Moduł systemowy weryfikuje poprawne działanie komponentów pobocznych witryny.
                                    </Typography>
                                </Box>
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
