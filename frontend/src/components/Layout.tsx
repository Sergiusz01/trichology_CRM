import { useState } from 'react';
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
} from '@mui/material';
import {
  People,
  Email,
  Logout,
  Menu,
  Settings,
  AccountCircle,
  Email as EmailIcon,
  Dashboard as DashboardIcon,
  Description,
  AttachMoney,
  History,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const menuItems = [
  { text: 'Panel główny', icon: <DashboardIcon />, path: '/' },
  { text: 'Pacjenci', icon: <People />, path: '/patients' },
  { text: 'Przychody', icon: <AttachMoney />, path: '/revenue' },
  { text: 'Dziennik aktywności', icon: <History />, path: '/activity' },
  { text: 'Historia emaili', icon: <Email />, path: '/email/history' },
  { text: 'Szablony emaili', icon: <EmailIcon />, path: '/email/templates' },
  { text: 'Szablony konsultacji', icon: <Description />, path: '/consultation-templates' },
  { text: 'Test email', icon: <Settings />, path: '/email/test' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
        }}
      >
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          System Trychologiczny
        </Typography>
      </Toolbar>

      <Divider />

      {/* User Info */}
      <Box sx={{ p: 2, bgcolor: 'primary.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 48,
              height: 48,
              fontWeight: 'bold',
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
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List>
          {menuItems.map((item) => {
            const active = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={active}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.50',
                      color: 'primary.main',
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.100',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.main',
                      },
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: active ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: active ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider />

      {/* Profile and Logout */}
      <Box sx={{ p: 1 }}>
        <ListItemButton
          onClick={() => navigate('/profile')}
          sx={{
            mx: 1,
            mb: 1,
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <AccountCircle />
          </ListItemIcon>
          <ListItemText
            primary="Mój profil"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItemButton>

        <ListItemButton
          onClick={logout}
          sx={{
            mx: 1,
            borderRadius: 2,
            color: 'error.main',
            '&:hover': {
              bgcolor: 'error.50',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'error.main', minWidth: 40 }}>
            <Logout />
          </ListItemIcon>
          <ListItemText
            primary="Wyloguj"
            primaryTypographyProps={{ fontSize: '0.9rem' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: { md: 'none' },
          borderRadius: 0,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            System Trychologiczny
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: { xs: '85vw', sm: drawerWidth },
              maxWidth: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
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
          minWidth: 0, // MOBILE FIX: Prevent flex item from overflowing
          maxWidth: '100%', // MOBILE FIX: Ensure content doesn't exceed viewport
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
