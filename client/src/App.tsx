import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { UserContext } from './context/UserContext';
import { useContext } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import theme from './theme';
import RecipeFinder from './pages/RecipeFinder';
import GiftGuide from './pages/GiftGuide';
import LLMSetup from './pages/LLMSetup';
import DecorationsPage from './pages/DecorationsPage';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import Login from './components/Login';
import ArtifactPanel from './components/ArtifactPanel';

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

const App: React.FC = () => {
  const userContext = useContext(UserContext);
  const [panelOpen, setPanelOpen] = React.useState(false);

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
      <Router>
        <Box sx={{ minHeight: '100vh', pb: 10, bgcolor: 'background.default' }}>
            <Container maxWidth="lg" sx={{ pt: 4 }}>
            {userContext?.user ? (
                <Routes>
                <Route path="/recipes" element={<RecipeFinder />} />
                <Route path="/gifts" element={<GiftGuide />} />
                <Route path="/decorations" element={<DecorationsPage />} />
                <Route path="/llm-setup" element={<LLMSetup />} />
                <Route path="/" element={<HomePage />} />
                </Routes>
            ) : (
                // If not logged in and NOT on /setup (handled by Routes above?), show Login prompt
                <Routes>
                    <Route path="/setup" element={<SetupPage />} />
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

            {userContext?.user && (
              <ArtifactPanel open={panelOpen} onToggle={() => setPanelOpen(!panelOpen)} />
            )}
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
