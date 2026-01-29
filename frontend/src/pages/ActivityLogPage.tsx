import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  IconButton,
  Alert,
  alpha,
} from '@mui/material';
import {
  PersonAdd,
  Edit,
  EventNote,
  CalendarToday,
  Science,
  PhotoCamera,
  Assignment,
  Email,
  ArrowForward,
  Refresh,
} from '@mui/icons-material';
import { api } from '../services/api';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  link: string;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'PATIENT': return <PersonAdd />;
    case 'PATIENT_EDIT': return <Edit />;
    case 'CONSULTATION': return <EventNote />;
    case 'CONSULTATION_EDIT': return <Edit />;
    case 'VISIT': return <CalendarToday />;
    case 'VISIT_EDIT': return <Edit />;
    case 'LAB_RESULT': return <Science />;
    case 'LAB_RESULT_EDIT': return <Edit />;
    case 'SCALP_PHOTO': return <PhotoCamera />;
    case 'CARE_PLAN': return <Assignment />;
    case 'CARE_PLAN_EDIT': return <Edit />;
    case 'EMAIL': return <Email />;
    default: return <EventNote />;
  }
}

function getActivityColor(type: string): string {
  if (type === 'PATIENT' || type === 'PATIENT_EDIT') return '#1976d2';
  if (type === 'CONSULTATION' || type === 'CONSULTATION_EDIT') return '#d32f2f';
  if (type === 'VISIT' || type === 'VISIT_EDIT') return '#34C759';
  if (type === 'LAB_RESULT' || type === 'LAB_RESULT_EDIT') return '#FF9500';
  if (type === 'SCALP_PHOTO') return '#AF52DE';
  if (type === 'CARE_PLAN' || type === 'CARE_PLAN_EDIT') return '#007AFF';
  return '#1976d2';
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ recentActivities?: ActivityItem[] }>('/dashboard');
      setActivities(res.data.recentActivities ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Nie udało się załadować dziennika.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Dziennik aktywności
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wszystkie zdarzenia w systemie: pacjenci, konsultacje, wizyty, wyniki badań i inne
            </Typography>
          </Box>
          <Button
            startIcon={<Refresh />}
            onClick={fetchActivities}
            variant="outlined"
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Odśwież
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : activities.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            Brak zapisanych aktywności.
          </Typography>
        ) : (
          <List sx={{ p: 0 }}>
            {activities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                {index > 0 && <Divider sx={{ my: 1 }} />}
                <ListItem
                  sx={{
                    px: 2,
                    py: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: alpha('#1976d2', 0.05),
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: getActivityColor(activity.type),
                        color: 'white',
                      }}
                    >
                      {getActivityIcon(activity.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {activity.title}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography component="span" variant="body2" color="text.primary">
                          {activity.subtitle}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          • {format(new Date(activity.date), 'dd MMM yyyy, HH:mm', { locale: pl })}
                        </Typography>
                      </Box>
                    }
                  />
                  {activity.link && (
                    <IconButton
                      edge="end"
                      onClick={() => navigate(activity.link)}
                      sx={{
                        bgcolor: alpha('#1976d2', 0.1),
                        '&:hover': { bgcolor: alpha('#1976d2', 0.2) },
                      }}
                    >
                      <ArrowForward sx={{ color: '#1976d2' }} />
                    </IconButton>
                  )}
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}
