import { createTheme, alpha } from '@mui/material/styles';

const brandAccent = '#3B82F6'; // Modern calm blue
const neutralBg = '#F8FAFC'; // Soft neutral background
const cardBg = '#FFFFFF';
const textPrimary = '#0F172A';
const textSecondary = '#64748B';
const borderLight = '#E2E8F0';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandAccent,
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#10B981', // Emerald for success/secondary acts
      contrastText: '#FFFFFF',
    },
    background: {
      default: neutralBg,
      paper: cardBg,
    },
    text: {
      primary: textPrimary,
      secondary: textSecondary,
    },
    divider: borderLight,
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
          borderColor: borderLight,
          color: textPrimary,
          '&:hover': {
            backgroundColor: '#F1F5F9',
            borderColor: '#CBD5E1',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            transition: 'all 0.2s',
            '& fieldset': {
              borderColor: borderLight,
            },
            '&:hover fieldset': {
              borderColor: '#CBD5E1',
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
          border: `1px solid ${borderLight}`,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.02)', // Minimal shadows (Notion/Stripe style)
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
          border: `1px solid ${borderLight}`,
        }
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: textSecondary,
            backgroundColor: neutralBg,
            borderBottom: `2px solid ${borderLight}`,
            fontSize: '0.875rem',
            padding: '12px 16px',
          },
          '& .MuiTableCell-body': {
            borderBottom: `1px solid ${borderLight}`,
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
          borderBottom: `1px solid ${borderLight}`,
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
          color: textSecondary,
          '&.Mui-selected': {
            color: textPrimary,
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
