import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Save, Lock } from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function UserProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await api.put('/user-profile/me', profileData);
      setSuccess('Profil został zaktualizowany');
      // Note: Auth context should be updated here if needed
    } catch (err: any) {
      setError(err.response?.data?.error || 'Wystąpił błąd podczas aktualizacji profilu');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setPasswordError('');
      setPasswordSuccess('');

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('Nowe hasła nie są identyczne');
        return;
      }

      await api.post('/user-profile/me/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordSuccess('Hasło zostało zmienione');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Wystąpił błąd podczas zmiany hasła');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: '1.5rem', sm: '2rem' },
          fontWeight: 'bold',
        }}
      >
        Mój profil
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dane osobowe
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <form onSubmit={handleProfileUpdate}>
                <TextField
                  label="Imię i nazwisko"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  fullWidth
                  required
                  margin="normal"
                />

                <TextField
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  fullWidth
                  required
                  margin="normal"
                />

                <Box sx={{ mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={loading}
                  >
                    Zapisz zmiany
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Zmiana hasła
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
              {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}

              <form onSubmit={handlePasswordChange}>
                <TextField
                  label="Aktualne hasło"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  fullWidth
                  required
                  margin="normal"
                />

                <TextField
                  label="Nowe hasło"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  fullWidth
                  required
                  margin="normal"
                  helperText="Minimum 6 znaków"
                />

                <TextField
                  label="Potwierdź nowe hasło"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  fullWidth
                  required
                  margin="normal"
                />

                <Box sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Lock />}
                disabled={loading}
                fullWidth={isMobile}
                size={isMobile ? 'medium' : 'large'}
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1.25, sm: 1.5 },
                }}
              >
                {isMobile ? 'Zmień hasło' : 'Zmień hasło'}
              </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

