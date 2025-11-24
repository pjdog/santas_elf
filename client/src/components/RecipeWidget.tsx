import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface RecipeWidgetProps {
  data: any; 
}

const RecipeWidget: React.FC<RecipeWidgetProps> = ({ data }) => {
  if (!data) return null;
  
  const recipe = Array.isArray(data) ? data[0] : data;

  return (
    <Card sx={{ mt: 2, mb: 2, bgcolor: '#fff', overflow: 'visible' }}>
      <Box sx={{ 
          bgcolor: '#FF3B30', 
          color: '#fff', 
          p: 2, 
          borderTopLeftRadius: 24, 
          borderTopRightRadius: 24,
          display: 'flex',
          alignItems: 'center'
      }}>
          <RestaurantMenuIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {recipe.name}
          </Typography>
      </Box>

      <CardContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
            {recipe.description}
        </Typography>
        
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Chip 
                icon={<AccessTimeIcon />} 
                size="small" 
                label={recipe.prepTime || 'N/A'} 
                sx={{ bgcolor: '#F2F2F7', fontWeight: 500 }} 
            />
             <Chip 
                size="small" 
                label={`${recipe.servings} Servings`} 
                sx={{ bgcolor: '#F2F2F7', fontWeight: 500 }} 
            />
        </Stack>

        <Divider textAlign="left" sx={{ mb: 1.5, color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600 }}>INGREDIENTS</Divider>
        
        <List dense disablePadding sx={{ mb: 3 }}>
            {recipe.ingredients.map((ing: any, idx: number) => (
                <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                    <Box 
                        component="span" 
                        sx={{ 
                            width: 6, 
                            height: 6, 
                            bgcolor: '#34C759', 
                            borderRadius: '50%', 
                            mr: 1.5, 
                            display: 'inline-block' 
                        }} 
                    />
                    <ListItemText 
                        primary={`${ing.quantity || ''} ${ing.unit || ''} ${ing.item}`} 
                        primaryTypographyProps={{ fontWeight: 500, fontSize: '0.95rem' }}
                    />
                </ListItem>
            ))}
        </List>

        <Divider textAlign="left" sx={{ mb: 1.5, color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600 }}>INSTRUCTIONS</Divider>
        
        <Box sx={{ pl: 1 }}>
            {recipe.instructions.map((step: string, i: number) => (
                <Box key={i} sx={{ display: 'flex', mb: 1.5 }}>
                    <Typography 
                        variant="caption" 
                        sx={{ 
                            minWidth: 24, 
                            height: 24, 
                            borderRadius: '50%', 
                            bgcolor: '#000', 
                            color: '#fff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            mr: 1.5,
                            fontWeight: 700
                        }}
                    >
                        {i + 1}
                    </Typography>
                    <Typography variant="body2" sx={{ pt: 0.2 }}>
                        {step}
                    </Typography>
                </Box>
            ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RecipeWidget;