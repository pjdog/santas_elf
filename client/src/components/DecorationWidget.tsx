import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';

interface DecorationWidgetProps {
  data: string; 
}

const DecorationWidget: React.FC<DecorationWidgetProps> = ({ data }) => {
  if (!data) return null;

  return (
    <Card sx={{ 
        mt: 2, 
        mb: 2, 
        background: 'linear-gradient(135deg, #FFF 0%, #F0FFF4 100%)',
        border: '1px solid rgba(52, 199, 89, 0.2)' 
    }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
            <AutoAwesomeIcon sx={{ color: '#34C759', mr: 1 }} />
            <Typography variant="h6" fontWeight={700}>Decoration Ideas</Typography>
        </Box>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, color: '#1D1D1F' }}>
            {data}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default DecorationWidget;