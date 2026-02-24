import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import plLocale from '@fullcalendar/core/locales/pl';
import listPlugin from '@fullcalendar/list';
import { Box, Paper, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PageHeader } from '../ui/PageHeader';

interface VisitEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    extendedProps: {
        patientId: string;
        patientName: string;
        visitType: string;
        status: string;
    };
}

export default function CalendarPage() {
    const [events, setEvents] = useState<VisitEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await api.get('/visits');
            const apiVisits = res.data.data || res.data;

            const mappedEvents = apiVisits.map((v: any) => {
                const startDate = new Date(v.data);
                const endDate = new Date(startDate.getTime() + 60 * 60000); // 60 min default

                return {
                    id: v.id,
                    title: `${v.patient?.firstName || ''} ${v.patient?.lastName || ''} - ${v.rodzajZabiegu || v.visitType || 'Wizyta'}`,
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    extendedProps: {
                        patientId: v.patientId,
                        patientName: `${v.patient?.firstName} ${v.patient?.lastName}`,
                        visitType: v.visitType,
                        status: v.status
                    },
                    color: v.status === 'COMPLETED' ? '#4caf50' : v.status === 'CANCELLED' ? '#f44336' : '#2196f3'
                };
            });
            setEvents(mappedEvents);
        } catch (error) {
            console.error('Failed to fetch visits for calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEventClick = (info: any) => {
        const { patientId } = info.event.extendedProps;
        if (patientId) {
            navigate(`/patients/${patientId}?tab=visits&visitId=${info.event.id}`);
        }
    };

    return (
        <Box>
            <PageHeader
                title="Kalendarz wizyt"
                subtitle="Zarządzaj harmonogramem wizyt pacjentów"
            />

            <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, borderRadius: 2, minHeight: { xs: '80vh', sm: '75vh' }, position: 'relative', overflow: 'hidden' }}>
                {loading && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                        <CircularProgress />
                    </Box>
                )}
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={isMobile ? 'listMonth' : 'timeGridWeek'}
                    headerToolbar={isMobile ? {
                        left: 'prev,next',
                        center: 'title',
                        right: 'listMonth,timeGridDay',
                    } : {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                    }}
                    locales={[plLocale]}
                    locale="pl"
                    events={events}
                    eventClick={handleEventClick}
                    height={isMobile ? '80vh' : 'auto'}
                    allDaySlot={false}
                    slotMinTime="07:00:00"
                    slotMaxTime="21:00:00"
                    eventTimeFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        meridiem: false,
                    }}
                    views={{
                        timeGridDay: {
                            titleFormat: { day: 'numeric', month: 'long', year: 'numeric' },
                        },
                        listMonth: {
                            noEventsText: 'Brak wizyt w tym miesiącu',
                        },
                        listWeek: {
                            noEventsText: 'Brak wizyt w tym tygodniu',
                        },
                    }}
                />
            </Paper>
        </Box>
    );
}
