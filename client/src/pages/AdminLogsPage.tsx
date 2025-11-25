import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/admin/logs');
        if (res.ok) {
            const text = await res.text();
            setLogs(text);
        } else {
            setLogs('Failed to load logs.');
        }
    } catch (e) {
        setLogs('Error connecting to server.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: '1200px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom color="error">🎅 Workshop Logs & Documentation</Typography>
      
      <Box sx={{ mb: 4 }}>
          <Button variant="contained" href="/api-docs" target="_blank" color="secondary" sx={{ mr: 2 }}>
              View Auto-Generated Documentation
          </Button>
          <Button variant="outlined" onClick={fetchLogs}>
              Refresh Logs
          </Button>
      </Box>

      <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#00ff00', fontFamily: 'monospace', overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
              <CircularProgress color="inherit" />
          ) : (
              <pre>{logs.split('\n').map((line, i) => {
                  try {
                      // Try to prettify JSON lines
                      return JSON.stringify(JSON.parse(line), null, 2) + '\n';
                  } catch (e) {
                      return line + '\n';
                  }
              })}</pre>
          )}
      </Paper>
    </Box>
  );
};

export default AdminLogsPage;
