import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const mainMenuItems = [
  { text: 'Panel główny', icon: <DashboardIcon />, path: '/' },
  { text: 'Pacjenci', icon: <People />, path: '/patients' },
  { text: 'Konsultacje', icon: <EventNote />, path: '/consultations' },
  { text: 'Przychody', icon: <AttachMoney />, path: '/revenue' },
];

const templateItems = [
  { text: 'Szablony konsultacji', icon: <Description fontSize="small" />, path: '/consultation-templates' },
  { text: 'Wyników badań', icon: <Science fontSize="small" />, path: '/lab-result-templates' },
  { text: 'Szablony emaili', icon: <FolderSpecial fontSize="small" />, path: '/email/templates' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const activeRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          minHeight: '64px !important',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', letterSpacing: 0.5 }}>
          Trycho CRM
        </Typography>
      </Toolbar>

      {/* User Info */}
      <Box sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 48,
              height: 48,
              fontWeight: 'bold',
              boxShadow: 1
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
              {user?.name || 'Użytkownik'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.role === 'DOCTOR' ? 'Lekarz' : 'Admin'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1.5 }}>
        <List sx={{ px: 1 }}>
          <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
            MENU GŁÓWNE
          </Typography>

          {mainMenuItems.map((item) => {
            const active = activeRoute(item.path);
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={active}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    mb: 0.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.50',
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'primary.100' },
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 600 : 500 }} />
                </ListItemButton>
              </ListItem>
            );
          })}

          <Box sx={{ mt: 2, mb: 1 }}>
            <Divider />
          </Box>

          <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
            ZARZĄDZANIE
          </Typography>

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setTemplatesOpen(!templatesOpen)}
              sx={{ mb: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                <FolderSpecial />
              </ListItemIcon>
              <ListItemText primary="Szablony" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
              {templatesOpen ? <ExpandLess color="action" /> : <ExpandMore color="action" />}
            </ListItemButton>
          </ListItem>

          <Collapse in={templatesOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2 }}>
              {templateItems.map((item) => {
                const active = activeRoute(item.path);
                return (
                  <ListItemButton
                    key={item.text}
                    selected={active}
                    onClick={() => handleNavigate(item.path)}
                    sx={{
                      mb: 0.5,
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: 'primary.50',
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: active ? 'primary.main' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400 }} />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>

          <ListItem disablePadding>
            <ListItemButton
              selected={activeRoute('/settings')}
              onClick={() => handleNavigate('/settings')}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                '&.Mui-selected': { bgcolor: 'primary.50', color: 'primary.main' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: activeRoute('/settings') ? 'primary.main' : 'text.secondary' }}>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Ustawienia Systemu" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: activeRoute('/settings') ? 600 : 500 }} />
            </ListItemButton>
          </ListItem>

        </List>
      </Box>

      <Divider />

      {/* Profile and Logout */}
      <Box sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
        <ListItemButton
          onClick={() => handleNavigate('/profile')}
          sx={{ mb: 1, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}><AccountCircle /></ListItemIcon>
          <ListItemText primary="Mój profil" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
        </ListItemButton>

        <ListItemButton
          onClick={logout}
          sx={{
            borderRadius: 2,
            color: 'error.main',
            '&:hover': { bgcolor: 'error.50' },
          }}
        >
          <ListItemIcon sx={{ color: 'error.main', minWidth: 40 }}><Logout /></ListItemIcon>
          <ListItemText primary="Wyloguj" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: { md: 'none' },
          bgcolor: 'primary.main',
        }}
      >
        <Toolbar>
          <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Trycho CRM
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: { xs: '85vw', sm: drawerWidth }, maxWidth: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, md: 0 },
          bgcolor: 'background.default',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
