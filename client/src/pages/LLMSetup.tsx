import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

const LLMSetup: React.FC = () => {
  const [provider, setProvider] = useState<string>('gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [severity, setSeverity] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/config/llm');
        if (response.ok) {
          const settings = await response.json();
          setProvider(settings.provider || 'gemini');
          setApiKey(settings.apiKey || '');
          setModel(settings.model || '');
          setBaseUrl(settings.baseUrl || '');
        }
      } catch (error) {
        console.error('Error fetching LLM settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleProviderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newProvider = e.target.value;
      setProvider(newProvider);
      // Set defaults
      if (newProvider === 'openai') {
          setBaseUrl('https://api.openai.com/v1');
          setModel('gpt-4o');
      } else if (newProvider === 'anthropic') {
          setBaseUrl('https://api.anthropic.com/v1');
          setModel('claude-3-5-sonnet-20240620');
      } else if (newProvider === 'gemini') {
          setBaseUrl('');
          setModel('gemini-1.5-flash');
      }
  };

  const handleTest = async () => {
    setMessage('Testing connection...');
    setSeverity('info');
    try {
        const response = await fetch('/api/llm/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider, apiKey, model, baseUrl }),
        });
        const data = await response.json();
        setMessage(data.message);
        setSeverity(response.ok ? 'success' : 'error');
    } catch (error) {
        console.error('Error testing LLM connection:', error);
        setMessage('Error testing connection.');
        setSeverity('error');
    }
  };

  const handleSave = async () => {
    try {
        const response = await fetch('/api/config/llm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider, apiKey, model, baseUrl }),
        });
        const data = await response.json();
        setMessage(data.message);
        setSeverity(response.ok ? 'success' : 'error');
    } catch (error) {
        console.error('Error saving LLM settings:', error);
        setMessage('Error saving settings.');
        setSeverity('error');
    }
  };

  return (
    <Box maxWidth="sm" sx={{ mx: 'auto' }}>
      <Typography variant="h2" gutterBottom color="primary" textAlign="center">LLM Setup</Typography>
      
      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Stack spacing={3}>
            <TextField
                select
                label="LLM Provider"
                value={provider}
                onChange={handleProviderChange}
                fullWidth
            >
                <MenuItem value="gemini">Google Gemini</MenuItem>
                <MenuItem value="openai">OpenAI (ChatGPT)</MenuItem>
                <MenuItem value="anthropic">Anthropic (Claude)</MenuItem>
                <MenuItem value="custom">Custom (OpenAI Compatible)</MenuItem>
            </TextField>

            <TextField
                label="API Key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKey ? "********" : "Enter your API key"}
                fullWidth
                helperText={apiKey && apiKey.includes('*') ? "Key is saved. Enter new one to update." : ""}
            />

            <TextField
                label="Model Name"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., gpt-4o, claude-3-5-sonnet"
                fullWidth
            />

            {(provider === 'custom' || provider === 'openai') && (
                <TextField
                    label="Base URL"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="e.g., https://api.openai.com/v1"
                    helperText="The base URL for the Chat Completions API"
                    fullWidth
                />
            )}

            <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="outlined" onClick={handleTest}>Test Connection</Button>
                <Button variant="contained" onClick={handleSave}>Save Settings</Button>
            </Stack>
        </Stack>
      </Paper>

      {message && (
        <Alert severity={severity} sx={{ mt: 2 }}>
            {message}
        </Alert>
      )}
    </Box>
  );
};

export default LLMSetup;
