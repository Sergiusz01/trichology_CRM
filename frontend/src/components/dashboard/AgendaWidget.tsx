import React from 'react';
import { Box, Typography, Avatar, IconButton, Button, alpha, Chip } from '@mui/material';
import { EventAvailable, PlayArrow, Close, EventNote } from '@mui/icons-material';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../../ui';

interface UpcomingVisit {
    id: string;
    data: string;
    rodzajZabiegu: string;
    status: string;
    patient: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export const AgendaWidget: React.FC<{ visits: UpcomingVisit[] }> = ({ visits }) => {
    const navigate = useNavigate();

    return (
        <AppCard sx={{ height: '100%', p: 3, borderRadius: 4, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#1976d2', 0.1) }}>
                    <EventAvailable sx={{ color: '#1976d2' }} />
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Dzisiejsza Agenda</Typography>
                    <Typography variant="body2" color="text.secondary">Nadchodzące wizyty pacjentów</Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visits.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                        Brak nadchodzących wizyt w najbliższym czasie.
                    </Typography>
                ) : (
                    visits.map((visit) => {
                        const visitDate = new Date(visit.data);
                        return (
                            <Box key={visit.id} sx={{ 
                                display: 'flex', 
                                gap: 2, 
                                p: 2, 
                                borderRadius: 3, 
                                border: '1px solid',
                                borderColor: alpha('#1976d2', 0.1),
                                bgcolor: 'white',
                                transition: 'all 0.2s',
                                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: alpha('#1976d2', 0.3) }
                            }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1976d2', lineHeight: 1 }}>
                                        {format(visitDate, 'HH:mm')}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(visitDate, 'dd MMM', { locale: pl })}
                                    </Typography>
                                </Box>
                                <Box sx={{ width: 4, borderRadius: 2, bgcolor: visit.status === 'ZAPLANOWANA' ? '#34C759' : '#FF9500' }} />
                                <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700, cursor: 'pointer', '&:hover': { color: '#1976d2' } }} onClick={() => navigate(`/patients/${visit.patient.id}`)}>
                                                {visit.patient.firstName} {visit.patient.lastName}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {visit.rodzajZabiegu}
                                            </Typography>
                                            <Chip size="small" label={visit.status} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: visit.status === 'ZAPLANOWANA' ? alpha('#34C759', 0.1) : alpha('#FF9500', 0.1), color: visit.status === 'ZAPLANOWANA' ? '#34C759' : '#FF9500' }} />
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Tooltip title="Rozpocznij konsultację">
                                                <IconButton size="small" onClick={() => navigate(`/patients/${visit.patient.id}/consultations/new`)} sx={{ bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', '&:hover': { bgcolor: alpha('#1976d2', 0.2) } }}>
                                                    <PlayArrow fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Zarządzaj wizytą">
                                                <IconButton size="small" onClick={() => navigate(`/visits`)} sx={{ bgcolor: alpha('#9e9e9e', 0.1), '&:hover': { bgcolor: alpha('#9e9e9e', 0.2) } }}>
                                                    <EventNote fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })
                )}
            </Box>
            <Button fullWidth variant="outlined" sx={{ mt: 3, borderRadius: 2, textTransform: 'none', fontWeight: 600 }} onClick={() => navigate('/visits')}>
                Zobacz cały kalendarz
            </Button>
        </AppCard>
    );
};
