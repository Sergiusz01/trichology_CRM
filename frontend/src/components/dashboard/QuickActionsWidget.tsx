import React from 'react';
import { Grid, Box, Typography, ButtonBase, Avatar, alpha } from '@mui/material';
import { PersonAdd, CalendarToday, Description, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const QuickActionsWidget: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const actions = [
        { label: 'Nowy pacjent', icon: PersonAdd, path: '/patients/new', color: '#1976d2' },
        { label: 'Nowa wizyta', icon: CalendarToday, path: '/visits/new', color: '#FF9500' },
        user?.role === 'ADMIN'
            ? { label: 'Ustawienia', icon: Description, path: '/settings', color: '#34C759' }
            : { label: 'Mój profil', icon: Person, path: '/profile', color: '#8E8E93' },
    ];

    return (
        <Box sx={{ mb: 4, px: { xs: 1, sm: 0 }, order: { xs: 3, md: 4 } }}>
            <Grid container spacing={2}>
                {actions.map((action) => (
                    <Grid key={action.path} size={{ xs: 4, sm: 4, md: 4 }}>
                        <ButtonBase
                            onClick={() => navigate(action.path)}
                            sx={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: 'center',
                                justifyContent: { xs: 'center', sm: 'flex-start' },
                                gap: { xs: 1, sm: 2 },
                                py: { xs: 2, sm: 2.5 },
                                px: { xs: 1, sm: 3 },
                                borderRadius: 4,
                                bgcolor: 'rgba(255, 255, 255, 0.7)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid',
                                borderColor: alpha(action.color, 0.2),
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: 'white', transform: 'translateY(-2px)', boxShadow: `0 8px 16px ${alpha(action.color, 0.1)}` },
                                '&:active': { transform: 'translateY(0)' },
                            }}
                        >
                            <Avatar sx={{ bgcolor: alpha(action.color, 0.1), color: action.color, width: { xs: 44, sm: 52 }, height: { xs: 44, sm: 52 } }}>
                                <action.icon />
                            </Avatar>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textAlign: { xs: 'center', sm: 'left' }, color: '#0F172A' }}>
                                {action.label}
                            </Typography>
                        </ButtonBase>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};
