import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF3B30', // Vibrant Red
    },
    secondary: {
      main: '#34C759', // Vibrant Green
    },
    background: {
      default: '#F5F5F7', // Apple Light Grey
      paper: 'rgba(255, 255, 255, 0.75)', // Glass effect base
    },
    text: {
      primary: '#1D1D1F', // Almost Black
      secondary: '#86868B', // Apple Grey
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 18,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F5F5F7',
          backgroundImage: 'radial-gradient(at 50% 0%, rgba(255, 59, 48, 0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(52, 199, 89, 0.05) 0px, transparent 50%)', 
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
        },
        elevation1: {
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        },
        elevation4: {
          // For the navbar
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50, // Pill shape buttons
          padding: '10px 24px',
        },
        contained: {
          boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(255, 59, 48, 0.4)',
          }
        }
      },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 24,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                    transform: 'scale(1.02)',
                }
            }
        }
    }
  },
});

export default theme;