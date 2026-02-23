import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import plLocale from '@fullcalendar/core/locales/pl';
import listPlugin from '@fullcalendar/list';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            // Ensure backend returns visits in a compatible format or we map it here
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/visits`);
            const apiVisits = res.data.data || res.data;

            const mappedEvents = apiVisits.map((v: any) => ({
                id: v.id,
                title: `${v.patient?.firstName} ${v.patient?.lastName} - ${v.visitType}`,
                start: v.scheduledDate,
                end: new Date(new Date(v.scheduledDate).getTime() + (v.durationMinutes || 60) * 60000).toISOString(),
                extendedProps: {
                    patientId: v.patientId,
                    patientName: `${v.patient?.firstName} ${v.patient?.lastName}`,
                    visitType: v.visitType,
                    status: v.status
                },
                color: v.status === 'COMPLETED' ? '#4caf50' : v.status === 'CANCELLED' ? '#f44336' : '#2196f3'
            }));
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
            navigate(`/patients/${patientId}`);
        }
    };

    return (
        <Box>
            <PageHeader
                title="Kalendarz wizyt"
                subtitle="Zarządzaj harmonogramem wizyt pacjentów"
            />

            <Paper sx={{ p: 3, borderRadius: 2, minHeight: '75vh', position: 'relative' }}>
                {loading && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                        <CircularProgress />
                    </Box>
                )}
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                    }}
                    locales={[plLocale]}
                    locale="pl"
                    events={events}
                    eventClick={handleEventClick}
                    height="auto"
                    allDaySlot={false}
                    slotMinTime="07:00:00"
                    slotMaxTime="21:00:00"
                />
            </Paper>
        </Box>
    );
}
