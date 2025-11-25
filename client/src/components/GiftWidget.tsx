import React, { useContext } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import { ArtifactContext } from '../context/ArtifactContext';

interface GiftWidgetProps {
  data: any[]; 
}

const GiftWidget: React.FC<GiftWidgetProps> = ({ data }) => {
  const context = useContext(ArtifactContext);

  if (!data || !Array.isArray(data)) return null;

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {data.map((gift, index) => (
        <Grid size={{ xs: 12, sm: 6 }} key={index}>
            <Card sx={{ 
                height: '100%', 
                bgcolor: '#fff',
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
            }}>
                <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <CardGiftcardIcon color="secondary" fontSize="small" sx={{ mt: 0.5 }} />
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                {gift.name}
                            </Typography>
                        </Stack>
                        {context && (
                            <Button 
                                size="small" 
                                color="secondary" 
                                startIcon={<BookmarkAddIcon />}
                                onClick={() => context.addGift(gift)}
                                sx={{ minWidth: 0, p: 0.5 }}
                            >
                                Save
                            </Button>
                        )}
                    </Stack>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                        {gift.description}
                    </Typography>
                    
                    <Chip 
                        label={`$${gift.budget?.min || 0} - $${gift.budget?.max || 100}`} 
                        size="small" 
                        sx={{ bgcolor: '#34C759', color: '#fff', fontWeight: 600 }} 
                    />
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button 
                        fullWidth 
                        variant="outlined" 
                        color="secondary" 
                        href={gift.link || `https://www.google.com/search?q=${encodeURIComponent(gift.name)}`} 
                        target="_blank"
                        sx={{ borderRadius: 20 }}
                    >
                        Find Online
                    </Button>
                </CardActions>
            </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default GiftWidget;
