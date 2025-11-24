import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StoreIcon from '@mui/icons-material/Store';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';

interface Ingredient {
    item: string;
    quantity: number;
    unit: string;
}

interface ShoppingListProps {
    ingredients: Ingredient[];
}

const ShoppingList: React.FC<ShoppingListProps> = ({ ingredients }) => {
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h5" gutterBottom color="secondary">
        Shopping List
      </Typography>
      <List dense>
        {ingredients.map((ing, idx) => (
          <ListItem key={idx}>
            <ListItemText primary={`${(ing.quantity || 0).toFixed(2)} ${ing.unit} ${ing.item}`} />
          </ListItem>
        ))}
      </List>
      <Stack direction="row" spacing={2} mt={2}>
        <Button variant="contained" color="success" startIcon={<LocalGroceryStoreIcon />}>
          Instacart
        </Button>
        <Button variant="contained" color="warning" startIcon={<ShoppingCartIcon />}>
          Amazon
        </Button>
        <Button variant="contained" color="success" sx={{ bgcolor: '#006400' }} startIcon={<StoreIcon />}>
          Whole Foods
        </Button>
      </Stack>
    </Box>
  );
};

export default ShoppingList;
