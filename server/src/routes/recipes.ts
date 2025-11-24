import { Router, Request, Response } from 'express';
import { tools } from '../tools';
import { Recipe } from '../types';
import { scaleIngredients } from '../utils/recipeUtils';
import redisClient from '../config/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : 'Christmas dinner';
    const guestsParam = typeof req.query.guests === 'string' ? parseInt(req.query.guests, 10) : undefined;

    // Use the LLM tool to find a recipe
    const result = await tools.find_recipe.function(query);
    
    let recipes: Recipe[] = [];
    
    if (result) {
        const recipe: Recipe = {
            id: 'llm-' + Date.now(),
            name: result.name,
            description: result.description,
            ingredients: result.ingredients || [],
            instructions: result.instructions || [],
            prepTime: result.prepTime || '',
            cookTime: result.cookTime || '',
            servings: result.servings || 4,
            dietary: result.dietary || [],
        };
        recipes = [recipe];
    }

    if (guestsParam && Number.isFinite(guestsParam) && guestsParam > 0) {
      recipes = recipes.map((recipe) => ({
        ...recipe,
        ingredients: scaleIngredients(recipe.ingredients, recipe.servings, guestsParam),
      }));
    }

    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recipeData = await redisClient.hGetAll(`recipe:${id}`);
    
    if (!recipeData || !recipeData.data) {
        return res.status(404).json({ message: 'Recipe not found' });
    }

    const recipe = JSON.parse(recipeData.data);
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
