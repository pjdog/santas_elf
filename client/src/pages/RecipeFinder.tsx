import React, { useEffect, useCallback } from 'react';
import ShoppingList from '../components/ShoppingList';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import RecipeWidget from '../components/RecipeWidget';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import Paper from '@mui/material/Paper';
import { useAssistantContext } from '../context/AssistantContext';

interface Ingredient {
    item: string;
    quantity: number;
    unit: string;
}

interface Recipe {
    id: string;
    name: string;
    description: string;
    ingredients: Ingredient[];
    instructions: string[];
    servings: number;
    prepTime?: string;
    cookTime?: string;
}

const RecipeFinder: React.FC = () => {
  const { recipePrefs, setRecipePrefs } = useAssistantContext();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = React.useState<Recipe | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', recipePrefs.query);
      if (recipePrefs.guests > 0) queryParams.append('guests', recipePrefs.guests.toString());
      if (recipePrefs.dietary) queryParams.append('dietary', recipePrefs.dietary);

      const response = await fetch(`/api/recipes?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRecipes(data);
    } catch (e) {
      setError('Failed to fetch recipes. Please try again later.');
      console.error("Error fetching recipes:", e);
    } finally {
      setLoading(false);
    }
  }, [recipePrefs.query, recipePrefs.guests, recipePrefs.dietary]);

  useEffect(() => {
    const handler = setTimeout(() => {
        fetchRecipes();
    }, 500); 

    return () => {
        clearTimeout(handler);
    };
  }, [recipePrefs.query, recipePrefs.guests, recipePrefs.dietary, fetchRecipes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipePrefs({ query: e.target.value });
  };

  const handleGuestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipePrefs({ guests: parseInt(e.target.value) || 0 });
  };

  const handleDietaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipePrefs({ dietary: e.target.value });
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  return (
    <Box sx={{ pb: 8 }}>
      {!selectedRecipe && (
          <>
            <Typography variant="h2" fontWeight={800} gutterBottom sx={{ 
                background: '-webkit-linear-gradient(45deg, #FF3B30, #FF9500)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                mb: 3
            }}>
                Recipe Finder
            </Typography>
            
            <Paper elevation={0} sx={{ mb: 4, p: 3, borderRadius: 4, bgcolor: 'background.paper' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        label="Search Recipes"
                        value={recipePrefs.query}
                        onChange={handleSearchChange}
                        variant="filled"
                        InputProps={{ disableUnderline: true, sx: { borderRadius: 2 } }}
                        placeholder="Try 'Roast Duck'"
                    />
                    <Stack direction="row" spacing={2} sx={{ minWidth: { md: 350 } }}>
                        <TextField
                            label="Guests"
                            type="number"
                            value={recipePrefs.guests}
                            onChange={handleGuestsChange}
                            variant="filled"
                            InputProps={{ inputProps: { min: 1 }, disableUnderline: true, sx: { borderRadius: 2 } }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="Dietary"
                            value={recipePrefs.dietary}
                            onChange={handleDietaryChange}
                            variant="filled"
                            InputProps={{ disableUnderline: true, sx: { borderRadius: 2 } }}
                            placeholder="e.g. Vegan"
                            sx={{ flex: 2 }}
                        />
                    </Stack>
                    <Button 
                        variant="contained" 
                        onClick={fetchRecipes} 
                        disabled={loading}
                        sx={{ minWidth: 60, height: 56, borderRadius: 3 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                    </Button>
                </Stack>
            </Paper>
          </>
      )}

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {selectedRecipe ? (
        <Box>
            <Button 
                startIcon={<ArrowBackIcon />} 
                onClick={() => setSelectedRecipe(null)} 
                sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}
            >
                All Recipes
            </Button>
            <RecipeWidget data={selectedRecipe} />
            <Box sx={{ mt: 3 }}>
                <ShoppingList ingredients={selectedRecipe.ingredients} />
            </Box>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {recipes.length > 0 ? (
            recipes.map((recipe) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={recipe.id}>
                  <Card 
                    onClick={() => handleSelectRecipe(recipe)}
                    sx={{ 
                        height: '100%', 
                        bgcolor: '#fff',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'pointer',
                        '&:hover': { 
                            transform: 'scale(1.02)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
                        }
                    }}
                  >
                      <CardActionArea sx={{ height: '100%', p: 2 }}>
                          <CardContent sx={{ p: 0 }}>
                              <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>{recipe.name}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                              }}>
                                  {recipe.description}
                              </Typography>
                          </CardContent>
                      </CardActionArea>
                  </Card>
              </Grid>
            ))
          ) : (
            !loading && (
                <Box sx={{ width: '100%', textAlign: 'center', mt: 5 }}>
                    <Typography variant="h6" color="text.secondary">No recipes found.</Typography>
                    <Typography variant="body2" color="text.secondary">Try adjusting your search.</Typography>
                </Box>
            )
          )}
        </Grid>
      )}
    </Box>
  );
};

export default RecipeFinder;
