import React from 'react';
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
    useTheme
} from '@mui/material';
import {
    Info,
    Memory,
    Update,
    Build,
    CloudDone
} from '@mui/icons-material';

export default function SettingsPage() {
    const theme = useTheme();

    // Te zmienne są wstrzykiwane przez strumień CI/CD GitHub Actions
    const appVersion = import.meta.env.VITE_APP_VERSION || 'DEV-LOCAL';
    const buildDate = import.meta.env.VITE_APP_BUILD_DATE || new Date().toLocaleString('pl-PL');
    const commitMessage = import.meta.env.VITE_APP_COMMIT_MESSAGE || 'Brak danych o commitcie (środowisko lokalne)';

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                Ustawienia Systemu
            </Typography>

            <Grid container spacing={3}>
                {/* Sekcja: O aplikacji */}
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

                {/* Sekcja: Stan systemu (Placeholder do dalszego zagospodarowania) */}
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
                                    Ta sekcja pozostaje w celach demonstracyjnych do rozbudowywania modułu w kolejnych wpisach.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
