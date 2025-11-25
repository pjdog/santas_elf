import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'logs' | 'docs'>('logs');

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
      <Typography variant="h4" gutterBottom color="error">🎅 Workshop Explorer</Typography>
      
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={fetchLogs} disabled={loading}>
              Refresh Logs
          </Button>
          <Typography variant="body2" color="text.secondary">
              View live logs or browse generated docs (similar to Sphinx) without leaving the app.
          </Typography>
      </Box>

      <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 2, minHeight: '70vh' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} aria-label="logs and docs tabs" textColor="secondary" indicatorColor="secondary" sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Logs" value="logs" />
            <Tab label="Docs Explorer" value="docs" />
        </Tabs>

        {tab === 'logs' && (
            <Box sx={{ p: 2, bgcolor: '#1e1e1e', color: '#00ff00', fontFamily: 'monospace', overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
                {loading ? (
                    <CircularProgress color="inherit" />
                ) : (
                    <pre>{logs.split('\n').map((line) => {
                        try {
                            // Try to prettify JSON lines
                            return JSON.stringify(JSON.parse(line), null, 2) + '\n';
                        } catch (e) {
                            return line + '\n';
                        }
                    })}</pre>
                )}
            </Box>
        )}

        {tab === 'docs' && (
            <Box sx={{ height: '70vh', bgcolor: '#0b0b0f' }}>
                {/* Embed generated docs so users can explore code/interfaces similar to Sphinx */}
                <iframe 
                    title="API & Code Docs" 
                    src="/docs" 
                    style={{ width: '100%', height: '100%', border: 'none', background: '#0b0b0f' }}
                />
            </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AdminLogsPage;
