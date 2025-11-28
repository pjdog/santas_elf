import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import theme from './theme';
import LLMSetup from './pages/LLMSetup';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import Login from './components/Login';
import { ArtifactProvider } from './context/ArtifactContext';
import AdminLogsPage from './pages/AdminLogsPage';

// Component to handle query params for errors
const AuthErrorAlert = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  
  if (!error) return null;
  
  let message = "Authentication failed.";
  if (error === 'NoUser') message = "Could not retrieve user details from Google.";
  if (error.includes('credentials')) message = "Google Authentication is not configured.";
  
  return (
      <Alert severity="error" sx={{ mb: 2, maxWidth: 600, mx: 'auto' }}>
          {message} <br/>
          {error.includes('credentials') && (
              <Button component={RouterLink} to="/setup" color="inherit" size="small" sx={{ mt: 1, fontWeight: 'bold' }}>
                  Go to Setup
              </Button>
          )}
      </Alert>
  );
};

// Component to redirect to external docs
export const RedirectToDocs = () => {
    useEffect(() => {
        window.location.href = "http://localhost:8080/api-docs";
    }, []);
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
};

const App: React.FC = () => {
  const userContext = useContext(UserContext);

  useEffect(() => {
    console.log(
        "%c🎄 Ho ho ho! Welcome to Santa's Workshop! 🎄",
        "font-size: 24px; font-weight: bold; color: #d32f2f; background: #fff; padding: 10px; border-radius: 5px; border: 2px solid #2e7d32;"
    );
    console.log(
        "%cInspect the inner workings of the elves here:",
        "font-size: 14px; color: #1565c0;"
    );
    console.log(
        "%c📜 Server Logs: %chttp://localhost:8080/elf-admin/logs", 
        "font-weight: bold;", "color: #2e7d32; text-decoration: underline;"
    );
    console.log(
        "%c📚 API Docs:   %chttp://localhost:8080/api-docs", 
        "font-weight: bold;", "color: #2e7d32; text-decoration: underline;"
    );
    console.log(
        "%c(If you see 'popover' errors, it's likely a browser extension trying to help! 🎁)",
        "font-size: 10px; color: #757575; font-style: italic;"
    );
  }, []);

  if (userContext?.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ArtifactProvider>
      <Router>
        <Box sx={{ minHeight: '100vh', pb: 10, bgcolor: 'background.default' }}>
            <Container maxWidth="lg" sx={{ pt: 4 }}>
            {userContext?.user ? (
                <Routes>
                  {/* 
                    Refactored Architecture:
                    HomePage is the main persistent view. 
                    Other features (Recipes, Gifts, Decor) are now accessed via the ArtifactPanel 
                    and no longer have separate top-level routes to ensure chat persistence.
                    
                    LLMSetup remains as a separate route for now as it's a distinct configuration step.
                  */}
                  <Route path="/llm-setup" element={<LLMSetup />} />
                  <Route path="/elf-admin/logs" element={<AdminLogsPage />} />
                  <Route path="/api-docs" element={<RedirectToDocs />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
            ) : (
                <Routes>
                    <Route path="/setup" element={<SetupPage />} />
                    <Route path="/api-docs" element={<RedirectToDocs />} />
                    <Route path="*" element={
                        <Box textAlign="center" mt={10}>
                            <Typography variant="h2" gutterBottom sx={{ background: '-webkit-linear-gradient(45deg, #FF3B30 30%, #FF9500 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Santa's Elf
                            </Typography>
                            <AuthErrorAlert />
                            <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
                                Your AI-powered holiday planner.
                            </Typography>
                            <Login />
                            <Button component={RouterLink} to="/setup" sx={{ mt: 2, display: 'block', mx: 'auto' }}>
                                Configure App
                            </Button>
                        </Box>
                    } />
                </Routes>
            )}
            </Container>
        </Box>
      </Router>
      </ArtifactProvider>
    </ThemeProvider>
  );
}

export default App;
