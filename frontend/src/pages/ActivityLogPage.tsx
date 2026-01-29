import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  alpha,
  Container,
} from '@mui/material';
import {
  Login as LoginIcon,
  PersonAdd,
  Edit,
  CalendarToday,
  Delete as DeleteIcon,
  Archive,
  Restore,
  ArrowForward,
  Refresh,
  EventNote,
  Science,
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatDateTime } from '../utils/dateFormat';

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  link: string;
  userName: string;
  userEmail: string;
  entity: string;
  entityId: string | null;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'LOGIN':
      return <LoginIcon />;
    case 'CREATE_PATIENT':
      return <PersonAdd />;
    case 'CREATE_VISIT':
      return <CalendarToday />;
    case 'CREATE_CONSULTATION':
      return <EventNote />;
    case 'CREATE_LAB_RESULT':
      return <Science />;
    case 'CREATE_CARE_PLAN':
      return <Assignment />;
    case 'RESTORE_PATIENT':
    case 'RESTORE_CONSULTATION':
    case 'RESTORE_LAB_RESULT':
    case 'RESTORE_CARE_PLAN':
      return <Restore />;
    case 'UPDATE_PATIENT':
    case 'UPDATE_VISIT':
    case 'UPDATE_VISIT_STATUS':
    case 'UPDATE_CONSULTATION':
    case 'UPDATE_LAB_RESULT':
    case 'UPDATE_CARE_PLAN':
      return <Edit />;
    case 'ARCHIVE_PATIENT':
    case 'ARCHIVE_CONSULTATION':
    case 'ARCHIVE_LAB_RESULT':
    case 'ARCHIVE_CARE_PLAN':
      return <Archive />;
    case 'PERMANENT_DELETE_PATIENT':
    case 'DELETE_VISIT':
    case 'PERMANENT_DELETE_CONSULTATION':
    case 'PERMANENT_DELETE_LAB_RESULT':
    case 'PERMANENT_DELETE_CARE_PLAN':
      return <DeleteIcon />;
    default:
      return <Edit />;
  }
}

function getActivityColor(type: string): string {
  if (type === 'LOGIN') return '#34C759';
  if (type.startsWith('CREATE_') || type.startsWith('RESTORE_')) return '#1976d2';
  if (type.startsWith('UPDATE_')) return '#FF9500';
  if (type.includes('DELETE') || type.startsWith('ARCHIVE_')) return '#d32f2f';
  return '#1976d2';
}

export default function ActivityLogPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ activities: ActivityItem[] }>('/activity', {
        params: { limit: 500 },
      });
      setActivities(res.data.activities || []);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Nie udało się załadować aktywności';
      setError(msg);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Dziennik aktywności
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wszystkie zdarzenia w systemie: logowania, zmiany pacjentów, wizyt i inne
            </Typography>
          </Box>
          <Button
            startIcon={<Refresh />}
            onClick={fetchActivities}
            variant="outlined"
            disabled={loading}
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
        {activities.length === 0 ? (
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
                      bgcolor: alpha('#667eea', 0.05),
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
                          {activity.userName} ({activity.userEmail})
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          • {formatDateTime(activity.date)}
                        </Typography>
                      </Box>
                    }
                  />
                  {activity.link && (
                    <IconButton
                      edge="end"
                      onClick={() => navigate(activity.link)}
                      sx={{
                        bgcolor: alpha('#667eea', 0.1),
                        '&:hover': { bgcolor: alpha('#667eea', 0.2) },
                      }}
                    >
                      <ArrowForward sx={{ color: '#667eea' }} />
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
