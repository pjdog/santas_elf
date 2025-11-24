import React, { useState, ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import DecorationWidget from '../components/DecorationWidget';

const DecorationsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestions('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/decorations/suggestions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (e) {
      console.error('Error uploading image:', e);
      setError('Failed to get decoration suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth="md" sx={{ mx: 'auto', textAlign: 'center', pb: 8 }}>
      <Typography variant="h2" fontWeight={800} gutterBottom sx={{ 
            background: '-webkit-linear-gradient(45deg, #30B0C7, #5856D6)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            mb: 2
      }}>
            Decoration Genius
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
        Upload a photo of your room, and I'll suggest festive themes!
      </Typography>
      
      <Paper 
        elevation={0}
        sx={{ 
            p: 5, 
            mb: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: 3,
            border: '2px dashed #e0e0e0',
            borderRadius: 4,
            bgcolor: '#F9F9F9',
            transition: 'border-color 0.2s',
            '&:hover': {
                borderColor: '#5856D6'
            }
        }}
      >
        {preview ? (
            <Box 
                component="img" 
                src={preview} 
                alt="Preview" 
                sx={{ 
                    maxWidth: '100%', 
                    maxHeight: 400, 
                    borderRadius: 3, 
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    objectFit: 'cover'
                }} 
            />
        ) : (
            <Box sx={{ py: 5, color: 'text.secondary' }}>
                <CloudUploadIcon sx={{ fontSize: 60, mb: 1, color: '#d1d1d6' }} />
                <Typography>No image selected</Typography>
            </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
                component="label"
                variant="outlined"
                size="large"
                startIcon={<CloudUploadIcon />}
                sx={{ borderRadius: 3 }}
            >
                {preview ? 'Change Image' : 'Select Image'}
                <input type="file" hidden onChange={handleFileChange} accept="image/*" />
            </Button>

            <Button 
                variant="contained" 
                size="large"
                color="primary" 
                onClick={handleUpload} 
                disabled={loading || !file}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                sx={{ 
                    borderRadius: 3, 
                    background: 'linear-gradient(45deg, #5856D6 30%, #30B0C7 90%)',
                    boxShadow: '0 4px 14px rgba(88, 86, 214, 0.4)'
                }}
            >
            {loading ? 'Analyzing...' : 'Magic'}
            </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {suggestions && (
          <Box sx={{ textAlign: 'left', mt: 4 }}>
               <DecorationWidget data={suggestions} />
          </Box>
      )}
    </Box>
  );
};

export default DecorationsPage;