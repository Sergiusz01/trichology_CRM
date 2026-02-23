import { createTheme, alpha } from '@mui/material/styles';

const brandAccent = '#3B82F6'; // Modern calm blue
const neutralBg = '#F8FAFC'; // Soft neutral background
const cardBg = '#FFFFFF';
const textPrimary = '#0F172A';
const textSecondary = '#64748B';
const borderLight = '#E2E8F0';

export const getThemeOptions = (mode: 'light' | 'dark') => ({
  palette: {
    mode,
    primary: {
      main: brandAccent,
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#10B981',
      contrastText: '#FFFFFF',
    },
    background: {
      default: mode === 'light' ? neutralBg : '#0f172a',
      paper: mode === 'light' ? cardBg : '#1e293b',
    },
    text: {
      primary: mode === 'light' ? textPrimary : '#f8fafc',
      secondary: mode === 'light' ? textSecondary : '#94a3b8',
    },
    divider: mode === 'light' ? borderLight : '#334155',
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#3B82F6' },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', color: textPrimary },
    h2: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: textPrimary },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', color: textPrimary },
    h4: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em', color: textPrimary },
    h5: { fontSize: '1.125rem', fontWeight: 600, color: textPrimary },
    h6: { fontSize: '1rem', fontWeight: 600, color: textPrimary },
    body1: { fontSize: '1rem', color: textPrimary, lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', color: textSecondary, lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 14, // Radius 14-16px as requested
  },
  spacing: 8, // Grid 8px
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Slightly rounder buttons
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.19)',
            transform: 'translateY(-1px)',
            transition: 'all 0.2s',
          },
        },
        outlined: {
          borderColor: mode === 'light' ? borderLight : '#334155',
          color: mode === 'light' ? textPrimary : '#f8fafc',
          '&:hover': {
            backgroundColor: mode === 'light' ? '#F1F5F9' : '#334155',
            borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined' as const,
        size: 'small' as const,
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.2s',
            '& fieldset': {
              borderColor: mode === 'light' ? borderLight : '#334155',
            },
            '&:hover fieldset': {
              borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
            },
            '&.Mui-focused fieldset': {
              borderColor: brandAccent,
              borderWidth: '2px',
            },
            '&.Mui-focused': {
              boxShadow: `${alpha(brandAccent, 0.1)} 0 0 0 3px`,
            }
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${mode === 'light' ? borderLight : '#334155'}`,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.02)',
          backgroundImage: 'none',
          '&:hover': {
            // Remove the aggressive hover jump from previous theme
          }
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.02)',
          border: `1px solid ${mode === 'light' ? borderLight : '#334155'}`,
        }
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: mode === 'light' ? textSecondary : '#94a3b8',
            backgroundColor: mode === 'light' ? neutralBg : '#0f172a',
            borderBottom: `2px solid ${mode === 'light' ? borderLight : '#334155'}`,
            fontSize: '0.875rem',
            padding: '12px 16px',
          },
          '& .MuiTableCell-body': {
            borderBottom: `1px solid ${mode === 'light' ? borderLight : '#334155'}`,
            padding: '12px 16px',
            fontSize: '0.875rem',
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        filled: {
          border: 'none',
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: 8,
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${mode === 'light' ? borderLight : '#334155'}`,
          minHeight: 40,
        },
        indicator: {
          height: 2,
          borderTopLeftRadius: 2,
          borderTopRightRadius: 2,
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 40,
          color: mode === 'light' ? textSecondary : '#94a3b8',
          '&.Mui-selected': {
            color: mode === 'light' ? textPrimary : '#f8fafc',
          }
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1E293B',
          color: '#FFFFFF',
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '6px 12px',
        }
      }
    }
  },
});
