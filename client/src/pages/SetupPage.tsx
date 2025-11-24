import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

const SetupPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [status, setStatus] = useState<{ configured: boolean; clientId: string | null }>({ configured: false, clientId: null });
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
      try {
          const res = await fetch('/api/config/auth');
          const data = await res.json();
          setStatus(data);
          if (data.configured) {
              setActiveStep(2); // Already done
          }
      } catch (e) {
          console.error("Failed to check config status", e);
      }
  };

  const handleJsonPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setJsonInput(val);
      try {
          const json = JSON.parse(val);
          // Google usually puts credentials under "web" or "installed"
          const creds = json.web || json.installed;
          if (creds) {
              if (creds.client_id) setClientId(creds.client_id);
              if (creds.client_secret) setClientSecret(creds.client_secret);
          }
      } catch (err) {
          // Ignore parsing errors while typing
      }
  };

  const handleSave = async () => {
      setLoading(true);
      setError(null);
      try {
          const res = await fetch('/api/config/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId, clientSecret })
          });
          
          if (!res.ok) throw new Error('Failed to save configuration');
          
          setSuccess('Configuration saved! You can now log in.');
          setStatus({ ...status, configured: true });
          setActiveStep(2);
      } catch (e) {
          setError('Failed to save. Please check the console/logs.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 8 }}>
        <Paper elevation={3} sx={{ p: 5, borderRadius: 4 }}>
            <Typography variant="h3" gutterBottom fontWeight={700}>Setup</Typography>
            
            <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                    <StepLabel>Welcome</StepLabel>
                    <StepContent>
                        <Typography color="text.secondary" sx={{ mb: 3 }}>
                            Welcome to Santa's Elf! To unlock the magic, we need to configure Google Authentication securely.
                        </Typography>
                        <Button variant="contained" onClick={() => setActiveStep(1)} size="large">
                            Get Started
                        </Button>
                    </StepContent>
                </Step>
                <Step>
                    <StepLabel>Google OAuth Configuration</StepLabel>
                    <StepContent>
                        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#F9F9F9', borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Instructions</Typography>
                            <Typography variant="body2" color="text.secondary">
                                1. Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: '#FF3B30' }}>Google Cloud Console</a>.<br/>
                                2. Create a project & enable "Google People API".<br/>
                                3. Create OAuth 2.0 Credentials.<br/>
                                4. Add Redirect URI: <code>{window.location.origin}/auth/google/callback</code>
                            </Typography>
                        </Paper>

                        <Accordion sx={{ mb: 3, boxShadow: 'none', '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                                <Box display="flex" alignItems="center" color="primary.main">
                                    <ContentPasteIcon sx={{ mr: 1, fontSize: 20 }} />
                                    <Typography fontWeight={600}>Paste JSON from Google</Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 0 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Paste client_secret.json content"
                                    placeholder='{"web":{"client_id":"...","client_secret":"..."}}'
                                    value={jsonInput}
                                    onChange={handleJsonPaste}
                                    variant="filled"
                                    sx={{ borderRadius: 2, overflow: 'hidden' }}
                                />
                            </AccordionDetails>
                        </Accordion>

                        <TextField 
                            fullWidth label="Client ID" variant="outlined" sx={{ mb: 2 }}
                            value={clientId} onChange={(e) => setClientId(e.target.value)}
                        />
                        <TextField 
                            fullWidth label="Client Secret" variant="outlined" type="password" sx={{ mb: 3 }}
                            value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
                        />
                        
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                        
                        <Box sx={{ mb: 2 }}>
                            <Button variant="contained" onClick={handleSave} disabled={loading} size="large">
                                {loading ? 'Saving...' : 'Save Configuration'}
                            </Button>
                            <Button onClick={() => setActiveStep(0)} sx={{ ml: 2 }} color="inherit">Back</Button>
                        </Box>
                    </StepContent>
                </Step>
                <Step>
                    <StepLabel>Finished</StepLabel>
                    <StepContent>
                        {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}
                        <Typography paragraph color="text.secondary">
                            You are all set! The workshop is open.
                        </Typography>
                        <Box sx={{ mb: 2, mt: 1 }}>
                            <Button variant="contained" href="/" size="large">Go to Login</Button>
                            <Button onClick={() => setActiveStep(1)} sx={{ ml: 2 }} color="inherit">Reconfigure</Button>
                        </Box>
                    </StepContent>
                </Step>
            </Stepper>
        </Paper>
    </Box>
  );
};

export default SetupPage;