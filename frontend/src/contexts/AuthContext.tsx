import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, LinearProgress, Box } from '@mui/material';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minut bezczynności
const WARNING_BEFORE_MS = 2 * 60 * 1000; // ostrzeżenie 2 minuty przed

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_BEFORE_MS / 1000);
  const navigate = useNavigate();

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Logout (optionally call backend) ────────────────────────────────────────
  const logout = useCallback(async (notifyBackend = true) => {
    if (notifyBackend) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await api.post('/auth/logout', { refreshToken }).catch(() => {/* silent */ });
        }
      } catch { }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setShowWarning(false);
    navigate('/login');
  }, [navigate]);

  // ─── Clear all timers ─────────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  // ─── Reset idle timer (called on any user activity) ──────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (!user) return;
    clearAllTimers();
    setShowWarning(false);

    // After (IDLE_TIMEOUT_MS - WARNING_BEFORE_MS) → show warning
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(WARNING_BEFORE_MS / 1000);

      // Countdown display every second
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownIntervalRef.current!);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      // Auto-logout after warning period
      idleTimerRef.current = setTimeout(() => {
        logout(true);
      }, WARNING_BEFORE_MS);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [user, clearAllTimers, logout]);

  // ─── Fetch current user ───────────────────────────────────────────────────────
  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── Login ────────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      setUser(user);
      navigate('/');
    } catch (error: any) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
      throw error;
    }
  };

  // ─── Init: load user + listen for forced logout events ───────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }

    const handleAuthLogout = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setShowWarning(false);
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [navigate]);

  // ─── Attach/detach idle listeners when user changes ──────────────────────────
  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      clearAllTimers();
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [user, resetIdleTimer, clearAllTimers]);

  // ─── "Stay logged in" button handler ─────────────────────────────────────────
  const handleStayLoggedIn = () => {
    resetIdleTimer();
  };

  const minutesLeft = Math.ceil(countdown / 60);
  const secondsLeft = countdown % 60;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout: () => logout(true) }}>
      {children}

      {/* Idle Warning Dialog */}
      <Dialog open={showWarning} maxWidth="xs" fullWidth disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          ⏳ Sesja wygasa
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Ze względów bezpieczeństwa zostaniesz automatycznie wylogowany za:
          </Typography>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: countdown <= 30 ? '#FF3B30' : '#007AFF', fontVariantNumeric: 'tabular-nums' }}>
              {minutesLeft > 0 ? `${minutesLeft}m ` : ''}{String(secondsLeft).padStart(2, '0')}s
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(countdown / (WARNING_BEFORE_MS / 1000)) * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: '#f0f0f3',
              '& .MuiLinearProgress-bar': {
                bgcolor: countdown <= 30 ? '#FF3B30' : '#007AFF',
                borderRadius: 3,
                transition: 'none',
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => logout(true)}
            variant="outlined"
            color="error"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Wyloguj teraz
          </Button>
          <Button
            onClick={handleStayLoggedIn}
            variant="contained"
            autoFocus
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#007AFF', '&:hover': { bgcolor: '#0056D6' } }}
          >
            Zostań zalogowany
          </Button>
        </DialogActions>
      </Dialog>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


