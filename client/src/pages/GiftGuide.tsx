import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import Paper from '@mui/material/Paper';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useAssistantContext } from '../context/AssistantContext';

interface Gift {
    id: string;
    name: string;
    description: string;
    recipient: string[];
    interests: string[];
    budget: {
        min: number;
        max: number;
    };
    link: string;
}

const GiftGuide: React.FC = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const { giftPrefs, setGiftPrefs } = useAssistantContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (giftPrefs.recipient) queryParams.append('recipient', giftPrefs.recipient);
      if (giftPrefs.interests) queryParams.append('interests', giftPrefs.interests);
      if (giftPrefs.budgetMin) queryParams.append('budgetMin', giftPrefs.budgetMin);
      if (giftPrefs.budgetMax) queryParams.append('budgetMax', giftPrefs.budgetMax);

      const response = await fetch(`/api/gifts?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGifts(data);
    } catch (e) {
      setError('Failed to fetch gifts. Please try again later.');
      console.error("Error fetching gifts:", e);
    } finally {
      setLoading(false);
    }
  }, [giftPrefs.recipient, giftPrefs.interests, giftPrefs.budgetMin, giftPrefs.budgetMax]);

  useEffect(() => {
    const handler = setTimeout(() => {
        fetchGifts();
    }, 500); 

    return () => {
        clearTimeout(handler);
    };
  }, [giftPrefs.recipient, giftPrefs.interests, giftPrefs.budgetMin, giftPrefs.budgetMax, fetchGifts]);

  return (
    <Box sx={{ pb: 8 }}>
      <Typography variant="h2" fontWeight={800} gutterBottom sx={{ 
            background: '-webkit-linear-gradient(45deg, #34C759, #30B0C7)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            mb: 3
      }}>
            Gift Guide
      </Typography>
      
      <Paper elevation={0} sx={{ mb: 4, p: 3, borderRadius: 4, bgcolor: 'background.paper' }}>
        <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                    fullWidth
                    label="Recipient"
                    value={giftPrefs.recipient}
                    onChange={(e) => setGiftPrefs({ recipient: e.target.value })}
                    variant="filled"
                    InputProps={{ disableUnderline: true, sx: { borderRadius: 2 } }}
                    placeholder="e.g. Mom"
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                    fullWidth
                    label="Interests"
                    value={giftPrefs.interests}
                    onChange={(e) => setGiftPrefs({ interests: e.target.value })}
                    variant="filled"
                    InputProps={{ disableUnderline: true, sx: { borderRadius: 2 } }}
                    placeholder="e.g. Gardening"
                />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                    fullWidth
                    label="Min $"
                    type="number"
                    value={giftPrefs.budgetMin}
                    onChange={(e) => setGiftPrefs({ budgetMin: e.target.value })}
                    InputProps={{ inputProps: { min: 0 }, disableUnderline: true, sx: { borderRadius: 2 } }}
                    variant="filled"
                />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                    fullWidth
                    label="Max $"
                    type="number"
                    value={giftPrefs.budgetMax}
                    onChange={(e) => setGiftPrefs({ budgetMax: e.target.value })}
                    InputProps={{ inputProps: { min: 0 }, disableUnderline: true, sx: { borderRadius: 2 } }}
                    variant="filled"
                />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
                <Button 
                    fullWidth 
                    variant="contained" 
                    onClick={fetchGifts} 
                    disabled={loading}
                    sx={{ height: '56px', borderRadius: 3 }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                </Button>
            </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {gifts.length > 0 ? (
          gifts.map((gift) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={gift.id}>
                <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    bgcolor: '#fff',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }
                }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                        <Stack direction="row" alignItems="flex-start" spacing={1} mb={1}>
                             <CardGiftcardIcon color="secondary" fontSize="small" sx={{ mt: 0.5 }} />
                             <Typography variant="h6" fontWeight={700} gutterBottom>{gift.name}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" paragraph>{gift.description}</Typography>
                        
                        <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                            {gift.recipient.map((rec, idx) => <Chip key={idx} label={rec} size="small" sx={{ bgcolor: '#F2F2F7' }} />)}
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                            {gift.interests.map((int, idx) => <Chip key={idx} label={int} size="small" variant="outlined" />)}
                        </Stack>

                        <Chip 
                            label={`$${gift.budget.min} - $${gift.budget.max}`} 
                            size="small"
                            color="success"
                            sx={{ fontWeight: 600 }}
                        />
                    </CardContent>
                    <CardActions sx={{ p: 2 }}>
                        {gift.link && (
                            <Button 
                                fullWidth 
                                variant="outlined" 
                                color="secondary"
                                href={gift.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                sx={{ borderRadius: 20 }}
                            >
                                View Product
                            </Button>
                        )}
                    </CardActions>
                </Card>
            </Grid>
          ))
        ) : (
            !loading && (
                <Box sx={{ width: '100%', textAlign: 'center', mt: 5 }}>
                    <Typography variant="h6" color="text.secondary">No gifts found.</Typography>
                </Box>
            )
        )}
      </Grid>
    </Box>
  );
};

export default GiftGuide;
