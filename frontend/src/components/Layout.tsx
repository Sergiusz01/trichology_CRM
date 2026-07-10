import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  Avatar,
  Divider,
  Collapse,
} from '@mui/material';
import {
  People,
  Logout,
  Menu,
  Settings,
  AccountCircle,
  Dashboard as DashboardIcon,
  Description,
  AttachMoney,
  EventNote,
  Science,
  ExpandLess,
  ExpandMore,
  FolderSpecial,
  CalendarMonth,
  EventAvailable,
  AdminPanelSettings,
  Brush,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 260; // Slightly narrower for a sleeker look

const mainMenuItems = [
  { text: 'Panel główny', icon: <DashboardIcon sx={{ fontSize: 20 }} />, path: '/' },
  { text: 'Pacjenci', icon: <People sx={{ fontSize: 20 }} />, path: '/patients' },
  { text: 'Kalendarz', icon: <CalendarMonth sx={{ fontSize: 20 }} />, path: '/calendar' },
  { text: 'Konsultacje', icon: <EventNote sx={{ fontSize: 20 }} />, path: '/consultations' },
  { text: 'Wizyty / Zabiegi', icon: <EventAvailable sx={{ fontSize: 20 }} />, path: '/visits' },
  { text: 'Przychody', icon: <AttachMoney sx={{ fontSize: 20 }} />, path: '/revenue' },
];

const templateItems = [
  { text: 'Konsultacje', icon: <Description sx={{ fontSize: 18 }} />, path: '/consultation-templates' },
  { text: 'Wyniki badań', icon: <Science sx={{ fontSize: 18 }} />, path: '/lab-result-templates' },
  { text: 'Emaile', icon: <FolderSpecial sx={{ fontSize: 18 }} />, path: '/email/templates' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const activeEl = document.activeElement as HTMLElement;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT' ||
        activeEl?.isContentEditable
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        navigate('/patients/new');
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/consultations/new');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const activeRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#FFFFFF' }}>
      {/* Brand Header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Logo" style={{ maxHeight: 60, maxWidth: '100%' }} />
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        <List disablePadding>
          <Typography variant="caption" sx={{ px: 1, color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Menu platformy
          </Typography>

          {mainMenuItems.map((item) => {
            const active = activeRoute(item.path);
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.50',
                      '&:hover': { bgcolor: 'primary.50' },
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                      '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 },
                    },
                    '&:hover': { bgcolor: '#F1F5F9' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, color: active ? 'primary.main' : 'text.primary' }} />
                </ListItemButton>
              </ListItem>
            );
          })}

          <Box sx={{ my: 2 }}><Divider sx={{ borderColor: '#F1F5F9' }} /></Box>

          <Typography variant="caption" sx={{ px: 1, color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Konfiguracja
          </Typography>


          <ListItem disablePadding>
            <ListItemButton
              selected={activeRoute('/settings')}
              onClick={() => handleNavigate('/settings')}
              sx={{
                borderRadius: 2,
                py: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.50',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 },
                },
                '&:hover': { bgcolor: '#F1F5F9' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: activeRoute('/settings') ? 'primary.main' : 'text.secondary' }}>
                <Settings sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary="Ustawienia" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: activeRoute('/settings') ? 600 : 500, color: activeRoute('/settings') ? 'primary.main' : 'text.primary' }} />
            </ListItemButton>
          </ListItem>

          {user?.role === 'ADMIN' && (
            <ListItem disablePadding>
              <ListItemButton
                selected={activeRoute('/users')}
                onClick={() => handleNavigate('/users')}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.50',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 },
                  },
                  '&:hover': { bgcolor: '#F1F5F9' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: activeRoute('/users') ? 'primary.main' : 'text.secondary' }}>
                  <AdminPanelSettings sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Użytkownicy" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: activeRoute('/users') ? 600 : 500, color: activeRoute('/users') ? 'primary.main' : 'text.primary' }} />
              </ListItemButton>
            </ListItem>
          )}

        </List>
      </Box>

      {/* User Profile Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #F1F5F9' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 1 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light', fontSize: 14, fontWeight: 600 }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ ml: 1.5, overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {user?.name || 'Użytkownik'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: -0.5 }}>
              {user?.role === 'DOCTOR' ? 'Lekarz specjalista' : 'Administrator'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ListItemButton onClick={() => handleNavigate('/profile')} sx={{ borderRadius: 2, py: 0.5, justifyContent: 'center', bgcolor: '#F8FAFC' }}>
            <AccountCircle sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
            <Typography variant="caption" fontWeight={600} color="text.secondary">Profil</Typography>
          </ListItemButton>
          <ListItemButton onClick={logout} sx={{ borderRadius: 2, py: 0.5, justifyContent: 'center', bgcolor: '#FEF2F2', '&:hover': { bgcolor: '#FEE2E2' } }}>
            <Logout sx={{ fontSize: 18, color: 'error.main', mr: 1 }} />
            <Typography variant="caption" fontWeight={600} color="error.main">Wyjdź</Typography>
          </ListItemButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          display: { md: 'none' },
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <Toolbar>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, color: 'text.primary' }}>
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{ maxHeight: 40 }} />
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #E2E8F0' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, md: 0 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
